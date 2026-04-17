"use client";

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FolderOpen, Upload, FileAudio, Play, Download, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskStatus {
  task_id: string;
  status: string;
  output?: any;
}

interface CloneComplete {
  task_id: string;
  output_path: string;
}

interface CloneError {
  task_id: string;
  error: string;
}

export default function VoiceClonePage() {
  const [projectPath, setProjectPath] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string>("");
  const [promptText, setPromptText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceFeature, setVoiceFeature] = useState<Uint8Array | null>(null);
  const [cloneStatus, setCloneStatus] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [outputPath, setOutputPath] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadProjectPath();
    setupListeners();
  }, []);

  const loadProjectPath = async () => {
    try {
      const path = await invoke<string | null>("get_project_path");
      if (path) setProjectPath(path);
    } catch (e) {
      console.error("Failed to load project path:", e);
    }
  };

  const setupListeners = () => {
    listen<TaskStatus>("voice-clone-progress", (event) => {
      setCloneStatus(event.payload.status);
    });

    listen<CloneComplete>("voice-clone-complete", (event) => {
      setOutputPath(event.payload.output_path);
      setIsProcessing(false);
    });

    listen<CloneError>("voice-clone-error", (event) => {
      setError(event.payload.error);
      setIsProcessing(false);
    });
  };

  const selectProjectFolder = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择项目文件夹"
      });
      if (selected && typeof selected === "string") {
        setProjectPath(selected);
        await invoke("set_project_path", { path: selected });
      }
    } catch (e) {
      console.error("Failed to select folder:", e);
      setError("选择文件夹失败");
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
        setAudioFile(file);
        setAudioPreview(URL.createObjectURL(file));
        setError("");
      } else {
        setError("请上传音频文件 (mp3, wav, m4a, ogg)");
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const clearAudio = () => {
    setAudioFile(null);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview("");
    setVoiceFeature(null);
    setCloneStatus("");
    setTaskId("");
    setOutputPath("");
    setError("");
  };

  const extractVoiceFeature = async () => {
    if (!audioFile) {
      setError("请先上传音频文件");
      return;
    }

    if (!projectPath) {
      setError("请先选择项目文件夹");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      await invoke("set_project_path", { path: projectPath });
      await invoke("set_api_token", { apiToken: "sk-85e09ea69821450cb18896bdcb032a51" });
      
      const tempPath = `${projectPath}/temp_audio_${Date.now()}.wav`;
      await invoke("save_temp_file", { data: Array.from(uint8Array), path: tempPath });
      
      const result = await invoke<number[]>("extract_voice_feature", {
        params: {
          file_path: tempPath,
          model: "CosyVoice-300M",
          prompt_text: promptText || "请输入与音频内容一致的文本描述"
        }
      });

      setVoiceFeature(new Uint8Array(result));
      setCloneStatus("声纹提取成功");
    } catch (e) {
      console.error("Extract voice feature failed:", e);
      setError(`声纹提取失败: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoiceClone = async () => {
    if (!voiceFeature) {
      setError("请先完成声纹提取");
      return;
    }

    if (!projectPath) {
      setError("请先选择项目文件夹");
      return;
    }

    setIsProcessing(true);
    setError("");
    setCloneStatus("等待中...");
    setOutputPath("");

    try {
      await invoke("set_project_path", { path: projectPath });
      await invoke("set_api_token", { apiToken: "sk-85e09ea69821450cb18896bdcb032a51" });

      const result = await invoke<any>("start_voice_clone", {
        params: {
          model: "CosyVoice3",
          input: "你好，这是我使用克隆声音生成的测试音频。",
          voice_url: `${projectPath}/voice_feature_${Date.now()}.pt`,
          prompt_text: promptText || undefined
        }
      });

      setTaskId(result.task_id);
      setCloneStatus(result.status);
    } catch (e) {
      console.error("Start voice clone failed:", e);
      setError(`启动克隆失败: ${e}`);
      setIsProcessing(false);
    }
  };

  const getStatusIcon = () => {
    if (isProcessing) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    if (cloneStatus === "succeeded" || outputPath) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (cloneStatus === "failed" || error) return <AlertCircle className="h-5 w-5 text-red-500" />;
    return <FileAudio className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isProcessing) return "处理中...";
    if (outputPath) return "完成";
    if (error) return "失败";
    return cloneStatus || "等待处理";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">声音克隆</h1>
        <p className="text-muted-foreground mt-1">上传音频样本，提取声纹特征，实现声音克隆</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">项目目录</h3>
            <Button variant="outline" size="sm" onClick={selectProjectFolder}>
              <FolderOpen className="h-4 w-4 mr-2" />
              选择文件夹
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm font-mono">
            {projectPath || "未选择项目文件夹"}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-medium mb-4">状态监控</h3>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {getStatusIcon()}
            <div>
              <div className="font-medium">{getStatusText()}</div>
              {taskId && <div className="text-xs text-muted-foreground">Task ID: {taskId}</div>}
            </div>
          </div>
          {outputPath && (
            <div className="mt-3 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
              已保存至: {outputPath}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="font-medium mb-4">音频上传</h3>
        
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {audioPreview ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <audio controls src={audioPreview} className="w-full max-w-md" />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <FileAudio className="h-4 w-4" />
                {audioFile.name}
              </div>
              <Button variant="outline" size="sm" onClick={clearAudio}>
                <X className="h-4 w-4 mr-1" />
                清除
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                拖拽音频文件到此处，或点击选择
              </p>
              <label>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button variant="secondary" size="sm" asChild>
                  <span>选择文件</span>
                </Button>
              </label>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="font-medium mb-4">声纹文本提示 (可选)</h3>
        <Input
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="请输入与音频内容一致的文本描述，用于提高声纹提取准确性"
          className="w-full"
        />
        <p className="text-xs text-muted-foreground mt-2">
          建议输入音频中朗读的文本内容，可提高声纹提取质量
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          onClick={extractVoiceFeature}
          disabled={!audioFile || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileAudio className="h-4 w-4 mr-2" />
          )}
          提取声纹特征
        </Button>

        {voiceFeature && audioFile && (
          <Button
            onClick={startVoiceClone}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            开始克隆
          </Button>
        )}

        {outputPath && (
          <Button variant="outline" onClick={() => {
            const link = document.createElement("a");
            link.href = `file://${outputPath}`;
            link.download = outputPath.split("/").pop() || "voice_clone.wav";
            link.click();
          }}>
            <Download className="h-4 w-4 mr-2" />
            下载音频
          </Button>
        )}
      </div>

      {voiceFeature && (
        <div className="rounded-lg border bg-green-500/10 p-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">声纹特征已提取 ({voiceFeature.byteLength} bytes)</span>
          </div>
        </div>
      )}
    </div>
  );
}
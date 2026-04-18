"use client";

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FolderOpen, Upload, FileAudio, Play, Download, X, CheckCircle, Loader2, AlertCircle, Mic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskStatus {
  task_id: string;
  status: string;
  output?: Record<string, unknown>;
}

interface CloneComplete {
  task_id: string;
  output_path: string;
}

interface CloneError {
  task_id: string;
  error: string;
}

interface AsyncTaskResult {
  task_id: string;
  status: string;
}

type TabType = "tts" | "clone";

const TTS_MODELS = [
  { value: "IndexTTS-2", label: "IndexTTS-2 (推荐)" },
  { value: "Spark-TTS-0.5B", label: "Spark-TTS-0.5B" },
  { value: "AudioFly", label: "AudioFly" },
  { value: "Qwen3-TTS", label: "Qwen3-TTS" },
  { value: "CosyVoice3", label: "CosyVoice3" },
];

const VOICE_PRESETS = [
  { value: "", label: "默认音色" },
  { value: "https://gitee.com/gitee-ai/moark-assets/raw/master/jay_prompt.wav", label: "Jay (中文男声)" },
  { value: "https://gitee.com/gitee-ai/moark-assets/raw/master/index-tts-2/emo_sad.wav", label: "Sad (情感)" },
  { value: "https://gitee.com/gitee-ai/moark-assets/raw/master/index-tts-2/emo_happy.wav", label: "Happy (情感)" },
];

export default function VoiceClonePage() {
  const [activeTab, setActiveTab] = useState<TabType>("tts");
  const [projectPath, setProjectPath] = useState<string>("");
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string>("");
  const [promptText, setPromptText] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceFeature, setVoiceFeature] = useState<Uint8Array | null>(null);
  const [cloneStatus, setCloneStatus] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [outputPath, setOutputPath] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [ttsInput, setTtsInput] = useState("");
  const [ttsModel, setTtsModel] = useState("IndexTTS-2");
  const [ttsPromptAudio, setTtsPromptAudio] = useState("");
  const [ttsPitch, setTtsPitch] = useState(1);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [ttsStatus, setTtsStatus] = useState("");
  const [ttsOutputPath, setTtsOutputPath] = useState("");

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

    listen<TaskStatus>("tts-progress", (event) => {
      setTtsStatus(event.payload.status);
    });

    listen<CloneComplete>("tts-complete", (event) => {
      setTtsOutputPath(event.payload.output_path);
      setTtsStatus("完成");
      setIsProcessing(false);
    });

    listen<CloneError>("tts-error", (event) => {
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
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
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
      await invoke("set_api_token", { apiToken: "" });
      
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
      await invoke("set_api_token", { apiToken: "" });

      const result = await invoke<AsyncTaskResult>("start_voice_clone", {
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

  const startTts = async () => {
    if (!ttsInput.trim()) {
      setError("请输入要转换的文本");
      return;
    }

    if (!projectPath) {
      setError("请先选择项目文件夹");
      return;
    }

    setIsProcessing(true);
    setError("");
    setTtsStatus("等待中...");
    setTtsOutputPath("");

    try {
      await invoke("set_project_path", { path: projectPath });
      await invoke("set_api_token", { apiToken: "" });

      const result = await invoke<AsyncTaskResult>("text_to_speech", {
        params: {
          model: ttsModel,
          inputs: ttsInput,
          prompt_text: undefined,
          prompt_audio_url: ttsPromptAudio || undefined,
          gender: undefined,
          pitch: ttsPitch !== 1 ? Math.floor(ttsPitch) : undefined,
          speed: ttsSpeed !== 1 ? Math.floor(ttsSpeed) : undefined,
        }
      });

      setTaskId(result.task_id);
      setTtsStatus(result.status);
    } catch (e) {
      console.error("Start TTS failed:", e);
      setError(`TTS 生成失败: ${e}`);
      setIsProcessing(false);
    }
  };

  const playAudio = (path: string) => {
    const audio = new Audio(`file://${path}`);
    audio.play();
  };

  const downloadAudio = (path: string) => {
    const link = document.createElement("a");
    link.href = `file://${path}`;
    link.download = path.split("/").pop() || "audio.wav";
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">语音合成</h1>
        <p className="text-muted-foreground mt-1">文本转语音 (TTS) 和声音克隆功能</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "tts" ? "default" : "outline"}
          onClick={() => setActiveTab("tts")}
        >
          <Volume2 className="h-4 w-4 mr-2" />
          文本转语音
        </Button>
        <Button
          variant={activeTab === "clone" ? "default" : "outline"}
          onClick={() => setActiveTab("clone")}
        >
          <Mic className="h-4 w-4 mr-2" />
          声音克隆
        </Button>
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
          <div className="p-3 rounded-lg bg-muted/50 text-sm font-mono truncate">
            {projectPath || "未选择项目文件夹"}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-medium mb-4">状态监控</h3>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            ) : (outputPath || ttsOutputPath) ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : error ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <FileAudio className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <div className="font-medium">
                {isProcessing 
                  ? "处理中..." 
                  : outputPath || ttsOutputPath 
                    ? "完成" 
                    : error 
                      ? "失败" 
                      : activeTab === "tts" 
                        ? ttsStatus || "等待处理" 
                        : cloneStatus || "等待处理"
                }
              </div>
              {taskId && <div className="text-xs text-muted-foreground">Task ID: {taskId}</div>}
            </div>
          </div>
        </div>
      </div>

      {activeTab === "tts" ? (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-medium mb-4">合成参数</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">模型选择</label>
                <select
                  value={ttsModel}
                  onChange={(e) => setTtsModel(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border bg-background"
                >
                  {TTS_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">音色参考 (可选)</label>
                <select
                  value={ttsPromptAudio}
                  onChange={(e) => setTtsPromptAudio(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border bg-background"
                >
                  {VOICE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">音调 (pitch): {ttsPitch}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={ttsPitch}
                  onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">语速 (speed): {ttsSpeed}</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-medium mb-4">输入文本</h3>
            <textarea
              value={ttsInput}
              onChange={(e) => setTtsInput(e.target.value)}
              placeholder="请输入要转换为语音的文本..."
              className="w-full h-40 px-3 py-2 rounded-lg border bg-background resize-none"
            />
            <div className="text-xs text-muted-foreground mt-2">
              {ttsInput.length} 字符
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={startTts}
              disabled={!ttsInput.trim() || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4 mr-2" />
              )}
              开始生成
            </Button>

            {ttsOutputPath && (
              <>
                <Button variant="outline" onClick={() => playAudio(ttsOutputPath)}>
                  <Play className="h-4 w-4 mr-2" />
                  播放
                </Button>
                <Button variant="outline" onClick={() => downloadAudio(ttsOutputPath)}>
                  <Download className="h-4 w-4 mr-2" />
                  下载
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="font-medium mb-4">音频上传</h3>
            
            <div
              className="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors border-border hover:border-primary/50"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {audioPreview ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <audio controls src={audioPreview} className="w-full max-w-md" />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <FileAudio className="h-4 w-4" />
                    {audioFile?.name}
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
              <>
                <Button variant="outline" onClick={() => playAudio(outputPath)}>
                  <Play className="h-4 w-4 mr-2" />
                  播放
                </Button>
                <Button variant="outline" onClick={() => downloadAudio(outputPath)}>
                  <Download className="h-4 w-4 mr-2" />
                  下载
                </Button>
              </>
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
      )}
    </div>
  );
}
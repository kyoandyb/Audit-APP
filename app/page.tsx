"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, ImageIcon, Send, Loader2, X, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface AuditFormData {
  station: string
  auditContent: string
  regulation: string
  photoUrl: string | null
}

function createEmptyForm(): AuditFormData {
  return {
    station: "",
    auditContent: "",
    regulation: "",
    photoUrl: null,
  }
}

export default function QualityAuditPage() {
  const [form, setForm] = useState<AuditFormData>(createEmptyForm())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [today, setToday] = useState<string | null>(null)
  
  // 所有的 Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  useEffect(() => {
    const date = new Date()
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"]
    const weekday = weekdays[date.getDay()]
    setToday(`${year}年${month}月${day}日 星期${weekday}`)
  }, [])

  const isComplete = form.station.trim() !== "" && form.auditContent.trim() !== ""

  // ★ 更新：直連自家 API 寫入 Notion 的送出邏輯 ★
  const handleSubmit = async () => {
    if (!form.station.trim() || !form.auditContent.trim()) {
      alert("無法送出：請填寫站別與稽核內容")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station: form.station,
          text: form.auditContent,
          regulation: form.regulation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Notion API 回應失敗");
      }

      alert("送出成功：稽核報告已直達 Notion 資料庫！")
      setForm(createEmptyForm())
    } catch (error: any) {
      alert(`送出失敗：${error.message}`)
      console.error("前端送出錯誤:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ★ 直通 Gemini 大腦的錄音機邏輯 ★
  const handleVoiceRecord = async () => {
    if (isRecording) {
      mediaRecorder.current?.stop()
      setIsRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorder.current = recorder
      audioChunks.current = []

      recorder.ondataavailable = (e: any) => {
        audioChunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const reader = new FileReader()
        
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1]
          
          alert("錄音完成！正在將原音檔傳送給 Gemini 進行專業辨識，請稍候...")

          try {
            const res = await fetch('/api/extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio, mimeType: 'audio/webm' })
            })

            if (!res.ok) throw new Error("API 掛了")

            const data = await res.json()

            setForm(prev => ({
              ...prev,
              station: data.station && data.station !== "無" ? data.station : prev.station,
              auditContent: data.description && data.description !== "無" ? data.description : prev.auditContent,
              regulation: data.regulation && data.regulation !== "無" ? data.regulation : prev.regulation
            }))

          } catch (error) {
            alert("Gemini 分析失敗！請確認 API 狀態。")
          }
        }
        
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setIsRecording(true)
    } catch (err) {
      alert("無法啟動麥克風，請檢查手機瀏覽器的麥克風權限設定。")
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setForm((prev) => ({ ...prev, photoUrl: url }))
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, photoUrl: null }))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-lg px-4 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">品質稽核系統</h1>
              <p className="text-sm text-muted-foreground">Quality Audit System</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{today ?? "載入中..."}</span>
            <span>
              已完成{" "}
              <span className={isComplete ? "text-primary font-medium" : ""}>
                {isComplete ? 1 : 0}
              </span>{" "}
              / 1 項
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <Button
          variant="outline"
          className={`w-full py-8 mb-6 border-2 transition-all ${
            isRecording
              ? "border-destructive bg-destructive/10 text-destructive shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
              : "border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
          }`}
          onClick={handleVoiceRecord}
        >
          <Mic className={`mr-3 h-6 w-6 ${isRecording ? "text-destructive" : ""}`} />
          <span className="text-base font-medium">
            {isRecording ? "🔴 錄音中... 講完請再按一次停止" : "按此錄音 (直接餵給 Gemini 聽)"}
          </span>
        </Button>

        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="space-y-2">
            <label htmlFor="station" className="text-sm font-medium text-foreground">站別</label>
            <Input
              id="station"
              type="text"
              placeholder="AI 將自動帶入站別..."
              value={form.station}
              onChange={(e: any) => setForm((prev) => ({ ...prev, station: e.target.value }))}
              className="h-12 bg-input border-border text-base placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="auditContent" className="text-sm font-medium text-foreground">稽核內容描述</label>
            <Textarea
              id="auditContent"
              placeholder="AI 將自動帶入缺失描述..."
              value={form.auditContent}
              onChange={(e: any) => setForm((prev) => ({ ...prev, auditContent: e.target.value }))}
              className="min-h-[140px] resize-none bg-input border-border text-base placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="regulation" className="text-sm font-medium text-foreground">法規相關</label>
            <Textarea
              id="regulation"
              placeholder="AI 將自動分析並帶入 ISO/SOP 條文..."
              value={form.regulation}
              onChange={(e: any) => setForm((prev) => ({ ...prev, regulation: e.target.value }))}
              className="min-h-[100px] resize-none bg-input border-border text-base placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">照片</label>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {form.photoUrl ? (
              <div className="relative aspect-square w-28 overflow-hidden rounded-lg border border-border">
                <img src={form.photoUrl} alt="稽核照片" className="h-full w-full object-cover" />
                <Button variant="destructive" size="icon" className="absolute right-1.5 top-1.5 h-7 w-7" onClick={handleRemovePhoto}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button type="button" onClick={handlePhotoClick} className="flex aspect-square w-28 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-input/50 hover:border-primary/50 hover:bg-primary/5">
                <ImageIcon className="h-7 w-7 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">上傳</span>
              </button>
            )}
          </div>
        </div>

        <Button className="w-full mt-6 py-7 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 傳送中...</> : <><Send className="mr-2 h-5 w-5" /> 送出稽核單</>}
        </Button>
      </main>
    </div>
  )
}
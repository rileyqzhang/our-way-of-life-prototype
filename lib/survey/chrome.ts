import type { SurveyLanguage } from "@/lib/survey/types";

const chrome = {
  basicTitle: { en: "Basic Info", es: "Información básica", zh: "基本信息" },
  requiredHint: {
    en: "Please fill in every field before continuing.",
    es: "Por favor, complete todos los campos antes de continuar.",
    zh: "请在继续之前填写所有字段。",
  },
  next: { en: "Next", es: "Siguiente", zh: "下一步" },
  back: { en: "Back", es: "Atrás", zh: "返回" },
  skip: { en: "Skip", es: "Omitir", zh: "跳过" },
  submit: { en: "Submit Your Story", es: "Enviar Su Historia", zh: "提交您的故事" },
  record: { en: "Record your answer", es: "Grabe su respuesta", zh: "录制您的回答" },
  stopRecord: { en: "Stop recording", es: "Detener grabación", zh: "停止录制" },
  listening: { en: "Listening...", es: "Escuchando...", zh: "正在聆听..." },
  saved: { en: "Recording saved.", es: "Grabación guardada.", zh: "录音已保存。" },
  denied: {
    en: "Microphone access denied. Please allow microphone access.",
    es: "Acceso al micrófono denegado. Por favor, permita el acceso al micrófono.",
    zh: "麦克风访问被拒绝。请允许使用麦克风。",
  },
  answerPlaceholder: { en: "Type your answer here...", es: "Escriba su respuesta aquí...", zh: "在此输入您的回答..." },
  or: { en: "You can also:", es: "También puede:", zh: "您也可以：" },
  of: { en: "of", es: "de", zh: "/" },
  thankYou: { en: "Thank You", es: "Gracias", zh: "感谢您" },
  reviewed: {
    en: "Your submission will be reviewed for posting.",
    es: "Su envío será revisado para su publicación.",
    zh: "您的提交将经过审阅后发布。",
  },
  cancel: { en: "Cancel", es: "Cancelar", zh: "取消" },
  confirm: { en: "Yes, Submit", es: "Sí, Enviar", zh: "确认提交" },
  upload: { en: "Upload your creative work", es: "Suba su obra creativa", zh: "上传您的创意作品" },
  uploadHint: {
    en: "Large images are automatically resized.",
    es: "Las imágenes grandes se redimensionan automáticamente.",
    zh: "较大的图片将自动缩小尺寸。",
  },
  fileTooLarge: {
    en: "Image is too large even after compression. Try a smaller image.",
    es: "La imagen es demasiado grande incluso después de comprimirla. Intente con una imagen más pequeña.",
    zh: "图片即使经过压缩仍然过大。请尝试上传较小的图片。",
  },
  notImage: {
    en: "Please choose an image file.",
    es: "Por favor, elija un archivo de imagen.",
    zh: "请选择一个图片文件。",
  },
  sending: { en: "Submitting...", es: "Enviando...", zh: "提交中..." },
  received: {
    en: "The archive received your response. It is not published.",
    es: "El archivo recibió su respuesta. No está publicada.",
    zh: "档案馆已收到您的回答。内容尚未发布。",
  },
  emailFailed: {
    en: "Your response was saved for review. The email notice to the archive could not be sent. Do not submit again.",
    es: "Su respuesta quedó guardada para revisión. No se pudo enviar el aviso por correo. No la envíe otra vez.",
    zh: "您的回答已保存待审。给档案馆的邮件通知未能发送。请不要再次提交。",
  },
  fileNotStored: {
    en: "The written response can be reviewed. The image or recording itself is not stored, because this project does not yet have a private file store.",
    es: "La respuesta escrita puede revisarse. La imagen o la grabación no se guardan, porque el proyecto todavía no tiene un almacén privado de archivos.",
    zh: "文字回答可以进入审阅。图片或录音本身不会被保存，因为项目还没有私人文件存储。",
  },
  paused: {
    en: "This questionnaire is not collecting responses. The project is waiting on its privacy review before any story, health information, or contact detail can be stored.",
    es: "Este cuestionario no está recogiendo respuestas. El proyecto espera su revisión de privacidad antes de guardar cualquier historia, información de salud o dato de contacto.",
    zh: "本问卷目前不收集回答。在隐私审查完成之前，项目不会保存任何故事、健康信息或联系方式。",
  },
} as const;

export function chromeText(key: keyof typeof chrome, lang: SurveyLanguage) {
  return chrome[key][lang];
}

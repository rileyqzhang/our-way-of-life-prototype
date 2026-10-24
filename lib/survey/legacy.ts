import type { SurveyConfig } from "@/lib/survey/types";

const yesNo = [
  { value: "Yes", label: { en: "Yes", es: "Sí", zh: "是" } },
  { value: "No", label: { en: "No", es: "No", zh: "否" } },
];

const education = [
  { value: "Elementary", label: { en: "Elementary", es: "Primaria", zh: "小学" } },
  { value: "Highschool", label: { en: "Highschool", es: "Secundaria", zh: "高中" } },
  { value: "College", label: { en: "College", es: "Universidad (técnica)", zh: "大专" } },
  { value: "University", label: { en: "University", es: "Universidad", zh: "大学" } },
];

/**
 * Recovered from camacosta100/our-way-of-life-timeline `content.js` and `story/index.html`.
 * Wording is copied from that source. This is the public fallback until a survey
 * document is published in Sanity. Draft survey documents are not used here.
 */
export const legacySurvey: SurveyConfig = {
  id: "shareYourStorySurvey",
  version: 1,
  title: { en: "Share Your Story", es: "Comparta Su Historia", zh: "分享您的故事" },
  introduction: {
    en: "You are invited to contribute to this study of civic participation. Take a moment to think about the people who shaped you and the moments that stand out. To be added to this website's participant list, fill out the questionnaire and include your email address so we can request your approval before publication.",
    es: "Le invitamos a contribuir a este estudio sobre la participación cívica. Tómese un momento para pensar en las personas que le formaron y en los momentos que destacan. Para ser añadido a la lista de participantes de este sitio, complete el cuestionario e incluya su dirección de correo electrónico para que podamos solicitar su aprobación antes de la publicación.",
    zh: "我们邀请您为这项关于公民参与的研究做出贡献。请花些时间想一想那些塑造了您的人，以及那些令您难忘的时刻。要加入本网站的参与者名单，请填写问卷并提供您的电子邮箱，以便我们在发布前征得您的同意。",
  },
  submitNote: {
    en: "Submissions will be reviewed before posting, and anonymity will be respected.",
    es: "Las respuestas serán revisadas antes de publicarse, y se respetará el anonimato.",
    zh: "所有提交内容在发布前都会经过审阅，并会尊重您的匿名选择。",
  },
  confirmationTitle: { en: "Submit your story?", es: "¿Enviar su historia?", zh: "提交您的故事？" },
  confirmationBody: {
    en: "Once submitted, your responses will be sent for review. You won't be able to edit them after this step.",
    es: "Una vez enviadas, sus respuestas serán revisadas. No podrá editarlas después de este paso.",
    zh: "提交后，您的回答将被送审。此步骤之后将无法再编辑。",
  },
  questions: [
    { key: "age", type: "text", group: "basic", required: true, label: { en: "Age:", es: "Edad:", zh: "年龄：" }, placeholder: { en: "e.g. 65", es: "ej. 65", zh: "例如 65" } },
    { key: "gender", type: "text", group: "basic", required: true, label: { en: "Gender:", es: "Género:", zh: "性别：" }, placeholder: { en: "e.g. Female", es: "ej. Femenino", zh: "例如 女性" } },
    { key: "race-ethnicity", type: "text", group: "basic", required: true, label: { en: "Race/ethnicity:", es: "Raza/origen étnico:", zh: "种族/民族：" }, placeholder: { en: "e.g. African American", es: "ej. Afroamericano/a", zh: "例如 非裔美国人" } },
    { key: "country", type: "text", group: "basic", required: true, label: { en: "Country of origin:", es: "País de origen:", zh: "原籍国：" }, placeholder: { en: "e.g. Mexico", es: "ej. México", zh: "例如 墨西哥" } },
    { key: "language-spoken", type: "text", group: "basic", required: true, label: { en: "Language(s) spoken:", es: "Idioma(s) que habla:", zh: "所讲语言：" }, placeholder: { en: "e.g. Spanish", es: "ej. Español", zh: "例如 西班牙语" } },
    { key: "years-us", type: "text", group: "basic", required: true, label: { en: "Years in the US:", es: "Años en EE. UU.:", zh: "在美国的年数：" }, placeholder: { en: "e.g. 40", es: "ej. 40", zh: "例如 40" } },
    { key: "years-city", type: "text", group: "basic", required: true, label: { en: "Years in current city:", es: "Años en su ciudad actual:", zh: "在当前城市的年数：" }, placeholder: { en: "e.g. 20", es: "ej. 20", zh: "例如 20" } },
    {
      key: "education",
      type: "select",
      group: "basic",
      required: true,
      label: { en: "Education:", es: "Educación:", zh: "学历：" },
      placeholder: { en: "Select...", es: "Seleccione...", zh: "请选择..." },
      options: education,
    },
    { key: "voted", type: "radio", group: "basic", required: true, label: { en: "Do you vote in local or presidential elections?", es: "¿Vota en las elecciones locales o presidenciales?", zh: "您会参与地方或总统选举投票吗？" }, options: yesNo },
    { key: "volunteer", type: "text", group: "basic", required: true, label: { en: "Do you volunteer?", es: "¿Hace trabajo voluntario?", zh: "您是否参与志愿活动？" }, placeholder: { en: "If yes, how?", es: "Si sí, ¿cómo?", zh: "如果是，您是如何参与的？" } },
    { key: "health", type: "text", group: "basic", required: true, label: { en: "Do you have health conditions?", es: "¿Tiene condiciones de salud?", zh: "您是否有健康状况？" }, placeholder: { en: "If yes, please describe", es: "Si sí, por favor describa", zh: "如果有，请说明" } },
    { key: "email", type: "email", group: "basic", required: true, label: { en: "Personal email:", es: "Correo electrónico personal:", zh: "个人电子邮箱：" }, placeholder: { en: "e.g. you@example.com", es: "ej. tu@ejemplo.com", zh: "例如 you@example.com" } },
    {
      key: "creative-work",
      type: "textarea",
      group: "creative",
      required: false,
      label: {
        en: "Based on your personal journey, create a poem, story, song, collage, drawing, photograph, and/or another creative work that captures the essence of your contributions over the years.",
        es: "Basándose en su trayectoria personal, cree un poema, cuento, canción, collage, dibujo, fotografía y/u otra obra creativa que capture la esencia de sus contribuciones a lo largo de los años.",
        zh: "请根据您的人生历程，创作一首诗、一个故事、一首歌、一幅拼贴、一幅画、一张照片和／或其他创意作品，来体现您多年来贡献的精髓。",
      },
      description: {
        en: "A question to guide your expression: what life experiences and key moments have influenced the ways you participate and give back to your community, and/or society?",
        es: "Una pregunta para guiar su expresión: ¿qué experiencias de vida y momentos clave han influido en las formas en que usted participa y contribuye a su comunidad o a la sociedad?",
        zh: "一个引导思考的问题：哪些人生经历与关键时刻影响了您参与并回馈您的社区或社会的方式？",
      },
      placeholder: { en: "Describe your work and writings here", es: "Describa aquí su obra y escritos", zh: "在此描述您的作品与文字" },
    },
    { key: "creative-file", type: "file", group: "creative", required: false, label: { en: "Upload your creative work", es: "Suba su obra creativa", zh: "上传您的创意作品" }, accept: "image/*" },
    {
      key: "civic-contribution",
      type: "textarea",
      group: "prompt",
      required: false,
      label: {
        en: "In the past 12 months, what community contribution has been most significant for you, and what made this experience meaningful or memorable?",
        es: "En los últimos 12 meses, ¿qué contribución comunitaria ha sido la más significativa para usted, y qué hizo que esta experiencia fuera significativa o memorable?",
        zh: "在过去的12个月里，哪项社区贡献对您最有意义？是什么让这次经历变得有意义或令人难忘？",
      },
      description: { en: "How did it make you feel to participate in this way?", es: "¿Cómo se sintió al participar de esta manera?", zh: "以这种方式参与让您有什么感受？" },
    },
    {
      key: "early-life",
      type: "textarea",
      group: "prompt",
      required: false,
      label: {
        en: "How would you describe the way individuals contributed/helped each other in the community where you grew up?",
        es: "¿Cómo describiría la manera en que las personas contribuían o se ayudaban unas a otras en la comunidad donde usted creció?",
        zh: "您会如何描述在您成长的社区中，人们是如何相互贡献或帮助彼此的？",
      },
      description: {
        en: "How was this culture similar or different from your personal experiences with your neighborhood or community?",
        es: "¿En qué se parecía o se diferenciaba esta cultura de sus experiencias personales con su vecindario o comunidad?",
        zh: "这种文化与您个人在自己社区或邻里中的经历有哪些相似或不同之处？",
      },
    },
    {
      key: "first-helping",
      type: "textarea",
      group: "prompt",
      required: false,
      label: {
        en: "Share a story of one of the first times you chose to help others or make a difference in a person's life, group, or community.",
        es: "Comparta una historia sobre una de las primeras veces que decidió ayudar a otros o marcar una diferencia en la vida de una persona, un grupo o una comunidad.",
        zh: "请分享一个故事：您最初选择帮助他人，或为某个人、群体或社区带来改变的经历之一。",
      },
      description: {
        en: "What motivated you (personally, socially, or politically), and how did that experience make you feel?",
        es: "¿Qué le motivó (personal, social o políticamente), y cómo le hizo sentir esa experiencia?",
        zh: "是什么激励了您（在个人、社会或政治方面），那段经历给您带来了怎样的感受？",
      },
    },
    {
      key: "influences",
      type: "textarea",
      group: "prompt",
      required: false,
      label: {
        en: "Share a story about something that happened in your life that changed how you contribute to your community or society (e.g., moving to a new place, changes in health, work, or loss).",
        es: "Comparta una historia sobre algo que sucedió en su vida que cambió la manera en que usted contribuye a su comunidad o a la sociedad (por ejemplo, mudarse a un lugar nuevo, cambios en la salud, el trabajo o una pérdida).",
        zh: "请分享一段您生命中发生的经历，它改变了您为社区或社会做贡献的方式（例如搬到新的地方、健康状况变化、工作变动或失去亲友）。",
      },
      description: {
        en: "How did this experience affect you? What changed in your perspective or actions?",
        es: "¿Cómo le afectó esta experiencia? ¿Qué cambió en su perspectiva o en sus acciones?",
        zh: "这段经历对您产生了怎样的影响？您的看法或行动发生了什么变化？",
      },
    },
    {
      key: "identity-civic",
      type: "textarea",
      group: "prompt",
      required: false,
      label: {
        en: "Share a story about a time when aspects of your identity (e.g., age, race, ethnicity, nationality, gender, language, or health status) shaped your participation.",
        es: "Comparta una historia sobre un momento en que aspectos de su identidad (por ejemplo, edad, raza, origen étnico, nacionalidad, género, idioma o estado de salud) influyeron en su participación.",
        zh: "请分享一个故事：您的身份特征（例如年龄、种族、民族、国籍、性别、语言或健康状况）曾如何影响了您的参与。",
      },
      description: {
        en: "Reflect on how these experiences affected you and in what ways they influenced your participation moving forward.",
        es: "Reflexione sobre cómo estas experiencias le afectaron y de qué maneras influyeron en su participación en adelante.",
        zh: "请回想这些经历如何影响了您，以及它们在哪些方面影响了您之后的参与方式。",
      },
    },
    {
      key: "civic-meaning",
      type: "textarea",
      group: "prompt",
      required: false,
      label: { en: "What does civic participation mean to you?", es: "¿Qué significa para usted la participación cívica?", zh: "公民参与对您意味着什么？" },
    },
    {
      key: "community-support",
      type: "textarea",
      group: "prompt",
      required: false,
      label: {
        en: "After thinking about how you have contributed over the years, what advice would you give people about the importance of getting involved and contributing to others outside family and work?",
        es: "Después de reflexionar sobre cómo ha contribuido a lo largo de los años, ¿qué consejo le daría a las personas sobre la importancia de involucrarse y contribuir a otros más allá de la familia y el trabajo?",
        zh: "在回顾您多年来所做的贡献之后，关于参与并为家庭和工作之外的他人做贡献的重要性，您会给其他人什么建议？",
      },
    },
  ],
};

export const LEGACY_QUESTION_KEYS = legacySurvey.questions.map((question) => question.key);

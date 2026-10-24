import type { StoryCollection } from "@/lib/content/collections";
import type { Locale } from "@/lib/i18n";
import type { LocalizedText } from "@/lib/timeline/types";

export type UiCopy = {
  skip: string;
  menuOpen: string;
  menuClose: string;
  languageLabel: string;
  siteName: string;
  nav: {
    home: string;
    timeline: string;
    share: string;
    stories: string;
    research: string;
    contact: string;
  };
  home: {
    eyebrow: string;
    title: string;
    lede: string;
    exploreStories: string;
    openTimeline: string;
    featuredEyebrow: string;
    readStory: string;
    collectionsEyebrow: string;
    collectionsTitle: string;
    timelineEyebrow: string;
    timelineTitle: string;
    timelineBody: string;
  };
  collections: { id: StoryCollection; label: string; title: string; description: string }[];
  stories: {
    title: string;
    lede: string;
    ledeContinued: string;
    listEyebrow: string;
    listTitle: string;
    readStory: string;
    learnMore: string;
    exploreTitle: string;
    exploreLede: string;
    exploreVolume: string;
    emptyCollection: string;
    unassignedTitle: string;
    unassignedNote: string;
    heroImageAlt: string;
    volumes: { id: StoryCollection; title: string; description: string; imageAlt: string }[];
  };
  story: {
    quotations: string;
    related: string;
    archiveLink: string;
    back: string;
    backParticipants: string;
    home: string;
    participants: string;
    team: string;
    contact: string;
    backTo: string;
    next: string;
    rights: string;
    sections: string;
  };
  about: {
    eyebrow: string;
    title: string;
    lede: string;
    missionEyebrow: string;
    missionTitle: string;
    missionBody: string;
    approachEyebrow: string;
    approachTitle: string;
    approachBody: string;
    methodsLabel: string;
    methodsTitle: string;
    methodsBody: string;
    peopleLabel: string;
    peopleTitle: string;
    peopleBody: string;
    archiveLabel: string;
    archiveTitle: string;
    archiveBody: string;
    browse: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    lede: string;
    heading: string;
    body: string;
  };
  share: {
    title: string;
    pausedTitle: string;
    pausedBody: string;
    emailCta: string;
    emailSubject: string;
    browse: string;
  };
  research: {
    transcripts: string;
    publications: string;
    methodology: string;
    transcriptsTitle: string;
    transcriptsLede: string;
    openDoc: string;
    docPending: string;
    dissertation: string;
    dissertationTitle: string;
    downloadPdf: string;
    pdfPending: string;
    methodologyTitle: string;
    methodologyBody: string;
  };
  footer: { about: string; contact: string; share: string; accessibility: string };
};

const en: UiCopy = {
  skip: "Skip to content",
  menuOpen: "Menu",
  menuClose: "Close",
  languageLabel: "Language",
  siteName: "Our Way of Life Archive",
  nav: {
    home: "Home",
    timeline: "Interactive Timeline",
    share: "Share Your Story",
    stories: "Participants",
    research: "For Research",
    contact: "Contact",
  },
  home: {
    eyebrow: "Community life stories · visual art · oral history",
    title: "Our Way of Life Archive",
    lede: "Amplifying the lifelong work of Latine immigrants, Chinese immigrants, and African American older adults through visual art and storytelling.",
    exploreStories: "Explore Stories",
    openTimeline: "Open Timeline",
    featuredEyebrow: "From the timeline",
    readStory: "Read this participant",
    collectionsEyebrow: "Collections",
    collectionsTitle: "Explore by community",
    timelineEyebrow: "Interactive Timeline",
    timelineTitle: "Place stories in historical context.",
    timelineBody: "Laws, migrations, and movements sit beside the stories participants told about living through them.",
  },
  collections: [
    { id: "latine", label: "Latine", title: "Latine Immigrant Stories", description: "Stories from Latine immigrant participants." },
    { id: "africanAmerican", label: "African American", title: "African American Stories", description: "Stories from African American older adults." },
    { id: "chinese", label: "Chinese", title: "Chinese Immigrant Stories", description: "Stories from Chinese immigrant participants." },
  ],
  stories: {
    title: "Participants",
    lede: "African Americans and Latinx adults (age 60+) living in California, New Jersey and New York shared their experiences of participating in their communities throughout their lives. In addition, they shared stories of the ways they contributed to the well-being of their communities during COVID-19, Black Lives Matter in 2020, and through personal life transitions of immigration and changes to their health and physical abilities.",
    ledeContinued:
      "Stories are presented in participants’ native language. Most African American participants were born in the North East where they currently reside, except a few born in the South and the Midwest. Latinx participants’ stories include experiences from their countries of origin; Mexico, El Salvador, Guatemala, Colombia, Ecuador, Puerto Rico y Peru.",
    listEyebrow: "Story cards — Participants",
    listTitle: "Their Words. Their Lives.",
    readStory: "Read Story",
    learnMore: "Learn more",
    exploreTitle: "Explore Collections",
    exploreLede: "Select an archival volume below to read living community histories.",
    exploreVolume: "Explore volume",
    emptyCollection: "No stories in this collection yet.",
    unassignedTitle: "Community not yet assigned",
    unassignedNote: "These stories do not yet have a verified community membership.",
    heroImageAlt: "Community members gathered on a sidewalk beside a banner that reads A Home for Every New Yorker.",
    volumes: [
      {
        id: "latine",
        title: "Latine Immigrant Stories",
        description: "Oral histories of migration, solidarity, and neighborhood mutual aid.",
        imageAlt: "A person standing with boxes of supplies outside a brick building.",
      },
      {
        id: "africanAmerican",
        title: "African American Stories",
        description: "Civil rights organizing, Harlem living memory, and generational service.",
        imageAlt: "A black-and-white photograph of people walking along a busy city sidewalk.",
      },
      {
        id: "chinese",
        title: "Chinese Immigrant Stories",
        description: "Labor history, displacement resilience, and Chinatown mutual aid.",
        imageAlt: "Shelves of canned food and dry goods in a community pantry.",
      },
    ],
  },
  story: {
    quotations: "Quotations",
    related: "On the timeline",
    archiveLink: "Also published on the current public archive",
    back: "All participants",
    backParticipants: "Back to Participants",
    home: "Home",
    participants: "Participants",
    team: "Our Team",
    contact: "Contact",
    backTo: "Back to",
    next: "Next Participant Story",
    rights: "© 2026 Our Way of Life Archive. All rights reserved.",
    sections: "Story sections",
  },
  about: {
    eyebrow: "About the Archive",
    title: "Stories held with care.",
    lede: "Our Way of Life Archive centers life stories and experiences through visual art, oral history, and storytelling.",
    missionEyebrow: "Our Mission",
    missionTitle: "Make lived experience visible, searchable, and shareable.",
    missionBody:
      "The archive brings together stories from Latine immigrants, Chinese immigrants, and African American older adults, preserving community knowledge through art and storytelling.",
    approachEyebrow: "Our Approach",
    approachTitle: "Community stories, presented in their own context.",
    approachBody:
      "Research methods and team information will be added from verified project materials. This page does not invent historical details or staff biographies.",
    methodsLabel: "Learn more",
    methodsTitle: "Research Methods",
    methodsBody: "Verified research methods will be added here.",
    peopleLabel: "People",
    peopleTitle: "Our Team",
    peopleBody: "Verified team bios and roles will be added here.",
    archiveLabel: "Archive",
    archiveTitle: "Explore Stories",
    archiveBody: "Move from project context into the participant quotations.",
    browse: "Browse participants",
  },
  contact: {
    eyebrow: "Contact",
    title: "Get in touch",
    lede: "Verified contact information will be added here before launch.",
    heading: "Project contact details",
    body: "This page does not publish an unverified email address or staff contact.",
  },
  share: {
    title: "Share Your Story",
    pausedTitle: "Send a project by email",
    pausedBody: "This site does not accept uploads. Email the research team and attach the project there.",
    emailCta: "Email the research team",
    emailSubject: "Project submission",
    browse: "Browse participants",
  },
  research: {
    transcripts: "Story Transcripts",
    publications: "Research & Publications",
    methodology: "Research Methodology",
    transcriptsTitle: "Open-Access Story Repository",
    transcriptsLede: "Read the de-identified transcripts and primary documents in a shared Google Doc.",
    openDoc: "Open the research document",
    docPending: "The Google Doc link will be added here.",
    dissertation: "Dissertation",
    dissertationTitle:
      "A phenomenological study exploring experiences of civic participation among older African Americans and Latinx immigrants using an intersectional life course perspective.",
    downloadPdf: "Download Full Dissertation (PDF)",
    pdfPending: "The dissertation PDF will be added here.",
    methodologyTitle: "Research Methodology",
    methodologyBody: "Verified research methods will be added here.",
  },
  footer: { about: "For Research", contact: "Contact", share: "Share Your Story", accessibility: "Accessibility" },
};

const es: UiCopy = {
  skip: "Saltar al contenido",
  menuOpen: "Menú",
  menuClose: "Cerrar",
  languageLabel: "Idioma",
  siteName: "Archivo Our Way of Life",
  nav: {
    home: "Inicio",
    timeline: "Línea de tiempo",
    share: "Comparte tu historia",
    stories: "Participantes",
    research: "Para la investigación",
    contact: "Contacto",
  },
  home: {
    eyebrow: "Historias de vida comunitaria · arte visual · historia oral",
    title: "Archivo Our Way of Life",
    lede: "Amplificando el trabajo de toda una vida de inmigrantes latines, inmigrantes chinos y personas mayores afroamericanas a través del arte visual y la narración.",
    exploreStories: "Explorar historias",
    openTimeline: "Abrir la línea de tiempo",
    featuredEyebrow: "De la línea de tiempo",
    readStory: "Leer a esta persona participante",
    collectionsEyebrow: "Colecciones",
    collectionsTitle: "Explorar por comunidad",
    timelineEyebrow: "Línea de tiempo interactiva",
    timelineTitle: "Situar las historias en su contexto histórico.",
    timelineBody:
      "Leyes, migraciones y movimientos aparecen junto a las historias que las personas participantes contaron sobre haberlos vivido.",
  },
  collections: [
    { id: "latine", label: "Latine", title: "Historias de inmigrantes latines", description: "Historias de personas participantes inmigrantes latines." },
    { id: "africanAmerican", label: "Afroamericana", title: "Historias afroamericanas", description: "Historias de personas mayores afroamericanas." },
    { id: "chinese", label: "China", title: "Historias de inmigrantes chinos", description: "Historias de personas participantes inmigrantes chinas." },
  ],
  stories: {
    title: "Participantes",
    lede: "Personas afroamericanas y latinas adultas (de 60 años o más) que viven en California, Nueva Jersey y Nueva York compartieron sus experiencias de participación en sus comunidades a lo largo de sus vidas. Además, compartieron historias sobre las formas en que contribuyeron al bienestar de sus comunidades durante la COVID-19, Black Lives Matter en 2020, y a través de transiciones personales de inmigración y cambios en su salud y capacidades físicas.",
    ledeContinued:
      "Las historias se presentan en la lengua de las personas participantes. La mayoría de las personas participantes afroamericanas nacieron en el noreste, donde viven ahora, excepto algunas nacidas en el sur y el medio oeste. Las historias latinas incluyen experiencias de sus países de origen: México, El Salvador, Guatemala, Colombia, Ecuador, Puerto Rico y Perú.",
    listEyebrow: "Fichas de historias — Participantes",
    listTitle: "Sus palabras. Sus vidas.",
    readStory: "Leer historia",
    learnMore: "Más información",
    exploreTitle: "Explorar colecciones",
    exploreLede: "Elige un volumen del archivo para leer historias vivas de la comunidad.",
    exploreVolume: "Explorar volumen",
    emptyCollection: "Todavía no hay historias en esta colección.",
    unassignedTitle: "Comunidad aún sin asignar",
    unassignedNote: "Estas historias todavía no tienen una pertenencia comunitaria verificada.",
    heroImageAlt: "Personas de la comunidad reunidas en una acera junto a una pancarta que dice A Home for Every New Yorker.",
    volumes: [
      {
        id: "latine",
        title: "Historias de inmigrantes latines",
        description: "Historias orales de migración, solidaridad y ayuda mutua en el barrio.",
        imageAlt: "Una persona de pie junto a cajas de suministros frente a un edificio de ladrillo.",
      },
      {
        id: "africanAmerican",
        title: "Historias afroamericanas",
        description: "Organización por los derechos civiles, memoria viva de Harlem y servicio entre generaciones.",
        imageAlt: "Una fotografía en blanco y negro de personas caminando por una acera concurrida.",
      },
      {
        id: "chinese",
        title: "Historias de inmigrantes chinos",
        description: "Historia laboral, resiliencia ante el desplazamiento y ayuda mutua en los barrios chinos.",
        imageAlt: "Estantes con comida enlatada y productos secos en una despensa comunitaria.",
      },
    ],
  },
  story: {
    quotations: "Citas",
    related: "En la línea de tiempo",
    archiveLink: "También publicada en el archivo público actual",
    back: "Todas las personas participantes",
    backParticipants: "Volver a participantes",
    home: "Inicio",
    participants: "Participantes",
    team: "Nuestro equipo",
    contact: "Contacto",
    backTo: "Volver a",
    next: "Siguiente historia",
    rights: "© 2026 Archivo Our Way of Life. Todos los derechos reservados.",
    sections: "Secciones de la historia",
  },
  about: {
    eyebrow: "Acerca del archivo",
    title: "Historias cuidadas.",
    lede: "El archivo Our Way of Life centra historias de vida y experiencias a través del arte visual, la historia oral y la narración.",
    missionEyebrow: "Nuestra misión",
    missionTitle: "Hacer visible, buscable y compartible la experiencia vivida.",
    missionBody:
      "El archivo reúne historias de inmigrantes latines, inmigrantes chinos y personas mayores afroamericanas, y preserva el conocimiento comunitario a través del arte y la narración.",
    approachEyebrow: "Nuestro enfoque",
    approachTitle: "Historias comunitarias, presentadas en su propio contexto.",
    approachBody:
      "Los métodos de investigación y la información del equipo se añadirán a partir de materiales verificados del proyecto. Esta página no inventa detalles históricos ni biografías del equipo.",
    methodsLabel: "Más información",
    methodsTitle: "Métodos de investigación",
    methodsBody: "Los métodos de investigación verificados se añadirán aquí.",
    peopleLabel: "Personas",
    peopleTitle: "Nuestro equipo",
    peopleBody: "Las biografías y los roles verificados del equipo se añadirán aquí.",
    archiveLabel: "Archivo",
    archiveTitle: "Explorar historias",
    archiveBody: "Pasar del contexto del proyecto a las citas de las personas participantes.",
    browse: "Ver participantes",
  },
  contact: {
    eyebrow: "Contacto",
    title: "Escríbenos",
    lede: "La información de contacto verificada se añadirá aquí antes del lanzamiento.",
    heading: "Datos de contacto del proyecto",
    body: "Esta página no publica un correo ni un contacto del equipo que no haya sido verificado.",
  },
  share: {
    title: "Comparte tu historia",
    pausedTitle: "Envía un proyecto por correo",
    pausedBody: "Este sitio no acepta cargas de archivos. Escribe al equipo de investigación y adjunta el proyecto.",
    emailCta: "Escribir al equipo de investigación",
    emailSubject: "Envío de proyecto",
    browse: "Ver participantes",
  },
  research: {
    transcripts: "Transcripciones",
    publications: "Investigación y publicaciones",
    methodology: "Metodología de investigación",
    transcriptsTitle: "Repositorio abierto de historias",
    transcriptsLede: "Lee las transcripciones desidentificadas y los documentos primarios en un Google Doc compartido.",
    openDoc: "Abrir el documento de investigación",
    docPending: "El enlace del Google Doc se añadirá aquí.",
    dissertation: "Tesis",
    dissertationTitle:
      "Un estudio fenomenológico sobre experiencias de participación cívica entre personas mayores afroamericanas e inmigrantes latines, desde una perspectiva interseccional del curso de vida.",
    downloadPdf: "Descargar la tesis completa (PDF)",
    pdfPending: "El PDF de la tesis se añadirá aquí.",
    methodologyTitle: "Metodología de investigación",
    methodologyBody: "Los métodos de investigación verificados se añadirán aquí.",
  },
  footer: { about: "Para la investigación", contact: "Contacto", share: "Comparte tu historia", accessibility: "Accesibilidad" },
};

const zh: UiCopy = {
  skip: "跳到主要内容",
  menuOpen: "菜单",
  menuClose: "关闭",
  languageLabel: "语言",
  siteName: "我们的生活方式档案",
  nav: {
    home: "首页",
    timeline: "互动时间线",
    share: "分享你的故事",
    stories: "参与者",
    research: "研究专区",
    contact: "联系",
  },
  home: {
    eyebrow: "社区生命故事 · 视觉艺术 · 口述历史",
    title: "我们的生活方式档案",
    lede: "通过视觉艺术与叙事，呈现拉丁裔移民、华裔移民和非裔美国长者一生的工作与经历。",
    exploreStories: "浏览故事",
    openTimeline: "打开时间线",
    featuredEyebrow: "来自时间线",
    readStory: "阅读这位参与者",
    collectionsEyebrow: "专题",
    collectionsTitle: "按社区浏览",
    timelineEyebrow: "互动时间线",
    timelineTitle: "把故事放回历史语境。",
    timelineBody: "法律、迁徙与社会运动，和参与者讲述的亲身经历放在一起。",
  },
  collections: [
    { id: "latine", label: "拉丁裔", title: "拉丁裔移民故事", description: "拉丁裔移民参与者的故事。" },
    { id: "africanAmerican", label: "非裔美国人", title: "非裔美国人故事", description: "非裔美国长者的故事。" },
    { id: "chinese", label: "华裔", title: "华裔移民故事", description: "华裔移民参与者的故事。" },
  ],
  stories: {
    title: "参与者",
    lede: "居住在加利福尼亚、新泽西和纽约、年满 60 岁的非裔美国人与拉丁裔长者，分享了他们一生参与社区的经历。他们也讲述了在 COVID-19 期间、2020 年 Black Lives Matter 运动中，以及在移民、健康和身体能力变化这些个人转折里，自己如何为社区的福祉做出贡献。",
    ledeContinued:
      "故事以参与者的母语呈现。大多数非裔美国参与者出生在他们现在居住的东北部，少数出生在南部和中西部。拉丁裔参与者的故事包括来自原居地的经历：墨西哥、萨尔瓦多、危地马拉、哥伦比亚、厄瓜多尔、波多黎各和秘鲁。",
    listEyebrow: "故事卡片 — 参与者",
    listTitle: "他们的话。他们的生活。",
    readStory: "阅读故事",
    learnMore: "了解更多",
    exploreTitle: "浏览专题",
    exploreLede: "选择下面的档案卷册，阅读鲜活的社区历史。",
    exploreVolume: "打开卷册",
    emptyCollection: "这个分类里还没有故事。",
    unassignedTitle: "尚未归入社区",
    unassignedNote: "这些故事还没有经过核对的社区归属。",
    heroImageAlt: "社区成员聚集在人行道上，旁边的横幅写着 A Home for Every New Yorker。",
    volumes: [
      {
        id: "latine",
        title: "拉丁裔移民故事",
        description: "关于迁徙、团结和邻里互助的口述历史。",
        imageAlt: "一个人站在砖楼外，旁边是一箱箱物资。",
      },
      {
        id: "africanAmerican",
        title: "非裔美国人故事",
        description: "民权组织、哈莱姆的生活记忆，以及代际间的服务。",
        imageAlt: "一张黑白照片，人们走在繁忙的城市人行道上。",
      },
      {
        id: "chinese",
        title: "华裔移民故事",
        description: "劳工史、面对流离的韧性，以及华埠的互助。",
        imageAlt: "社区食物储藏室里摆满罐头和干货的货架。",
      },
    ],
  },
  story: {
    quotations: "引语",
    related: "在时间线上",
    archiveLink: "当前公开档案中的版本",
    back: "全部参与者",
    backParticipants: "返回参与者",
    home: "首页",
    participants: "参与者",
    team: "我们的团队",
    contact: "联系",
    backTo: "返回",
    next: "下一位参与者的故事",
    rights: "© 2026 我们的生活方式档案。保留所有权利。",
    sections: "故事章节",
  },
  about: {
    eyebrow: "关于档案",
    title: "被慎重保存的故事。",
    lede: "我们的生活方式档案通过视觉艺术、口述历史和叙事，呈现生命故事与经历。",
    missionEyebrow: "我们的使命",
    missionTitle: "让亲身经历可以被看见、检索和分享。",
    missionBody: "档案汇集拉丁裔移民、华裔移民和非裔美国长者的故事，通过艺术与叙事保存社区知识。",
    approachEyebrow: "我们的方法",
    approachTitle: "社区故事，放在它们自己的语境里。",
    approachBody: "研究方法和团队信息将根据已核实的项目材料补充。本页不编造历史细节或工作人员简介。",
    methodsLabel: "进一步了解",
    methodsTitle: "研究方法",
    methodsBody: "已核实的研究方法将补充在这里。",
    peopleLabel: "人员",
    peopleTitle: "我们的团队",
    peopleBody: "已核实的团队简介和职责将补充在这里。",
    archiveLabel: "档案",
    archiveTitle: "浏览故事",
    archiveBody: "从项目背景进入参与者的引语。",
    browse: "查看参与者",
  },
  contact: {
    eyebrow: "联系",
    title: "与我们联系",
    lede: "上线前会在这里补充已核实的联系方式。",
    heading: "项目联系信息",
    body: "本页不公布未经核实的电子邮箱或工作人员联系方式。",
  },
  share: {
    title: "分享你的故事",
    pausedTitle: "通过邮件发送项目",
    pausedBody: "本网站不接收文件上传。请发邮件给研究团队，并在邮件里附上项目。",
    emailCta: "发邮件给研究团队",
    emailSubject: "项目投稿",
    browse: "查看参与者",
  },
  research: {
    transcripts: "故事文稿",
    publications: "研究与出版物",
    methodology: "研究方法",
    transcriptsTitle: "开放获取的故事库",
    transcriptsLede: "在共享的 Google 文档里阅读已去标识的文稿和原始文献。",
    openDoc: "打开研究文档",
    docPending: "Google 文档链接将补充在这里。",
    dissertation: "学位论文",
    dissertationTitle: "一项现象学研究报告：从交叉性生命历程视角，探讨非裔美国长者与拉丁裔移民的公民参与经历。",
    downloadPdf: "下载完整学位论文（PDF）",
    pdfPending: "学位论文 PDF 将补充在这里。",
    methodologyTitle: "研究方法",
    methodologyBody: "已核实的研究方法将补充在这里。",
  },
  footer: { about: "研究专区", contact: "联系", share: "分享你的故事", accessibility: "无障碍" },
};

export const ui: Record<Locale, UiCopy> = { en, es, zh };

export type PageDocument = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  body?: LocalizedText;
};

export type NavItem = { label: LocalizedText; path: string };

export type SiteSettings = {
  siteName: LocalizedText;
  navigation: NavItem[];
  contactEmail?: string;
  accessibilityUrl: string;
};

function field(read: (copy: UiCopy) => string): LocalizedText {
  return { en: read(en), es: read(es), zh: read(zh) };
}

export const localPages: PageDocument[] = [
  { slug: "home", title: field((copy) => copy.home.title), summary: field((copy) => copy.home.lede) },
  { slug: "stories", title: field((copy) => copy.stories.title), summary: field((copy) => copy.stories.lede), body: field((copy) => copy.stories.ledeContinued) },
  { slug: "about", title: field((copy) => copy.about.title), summary: field((copy) => copy.about.lede), body: field((copy) => copy.about.missionBody) },
  { slug: "contact", title: field((copy) => copy.contact.title), summary: field((copy) => copy.contact.lede), body: field((copy) => copy.contact.body) },
  { slug: "share-your-story", title: field((copy) => copy.share.title), summary: field((copy) => copy.share.pausedBody) },
];

export const localSettings: SiteSettings = {
  siteName: field((copy) => copy.siteName),
  navigation: [
    { label: field((copy) => copy.nav.home), path: "/" },
    { label: field((copy) => copy.nav.timeline), path: "/timeline" },
    { label: field((copy) => copy.nav.share), path: "/share-your-story" },
    { label: field((copy) => copy.nav.stories), path: "/stories" },
    { label: field((copy) => copy.nav.research), path: "/research" },
    { label: field((copy) => copy.nav.contact), path: "/contact" },
  ],
  accessibilityUrl: "https://dap.berkeley.edu/",
};

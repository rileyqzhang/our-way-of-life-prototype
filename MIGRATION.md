# Figma Make 原型移植说明

来源是 `_prototype/src/App.tsx`（2065 行）。页面切换靠 `App` 里的 `useState`，内容写在这个文件里。这一步只定移植方案，不改页面代码。

现有站点是 Next.js App Router，内容经 `getArchive()` 读 Sanity。所有路由文件都放在 `app/(site)/[lang]/` 下。`middleware.ts` 会把没有语言前缀的路径转到 `/en`：访问 `/` 会到 `/en`，访问 `/stories/bmnj` 会到 `/en/stories/bmnj`。下面写的地址是去掉语言前缀之后的样子。

目标路由：

| 地址 | 文件 |
| --- | --- |
| `/` | `app/(site)/[lang]/page.tsx` |
| `/stories/[slug]` | `app/(site)/[lang]/stories/[slug]/page.tsx` |
| `/stories/collections/[collection]` | `app/(site)/[lang]/stories/collections/[collection]/page.tsx` |
| `/research` | `app/(site)/[lang]/research/page.tsx` |
| `/research/methodology` | `app/(site)/[lang]/research/methodology/page.tsx` |
| `/research/publications` | `app/(site)/[lang]/research/publications/page.tsx` |

`[collection]` 沿用现有合集 slug：`latine`、`africanAmerican`、`chinese`。合集留在 `/stories/collections/[collection]`，不新建 `/collections`。研究留在现有的三个地址，不新建 `/researchers`。

原型用了 Tailwind class。这个 Next 项目没有 Tailwind，样式在 `app/globals.css`。移植时把外观写进这里，不要为了原型把 Tailwind 加进来。

## 1. 组件和数据常量

行号都指 `_prototype/src/App.tsx`。

| 行号 | 名称 | 作用 |
| --- | --- | --- |
| 3–6 | `logoImg`、`heroImg`、`bmnjPhoto`、`reyesPhoto` | 本地图片。只移植标志、方法论配图和 BMNJ 的真实照片。`reyesPhoto` 不移植。 |
| 8 | `ArchiveTransitionDirection` | 合集书本打开、返回时的过渡方向。 |
| 10–34 | `runArchiveTransition` | 用 View Transition API 包住页面切换；系统要求减少动效时直接更新。 |
| 37–51 | `useFadeIn` | 元素进入视口后只淡入一次。 |
| 54–68 | `FadeSection` | 给一块内容加上滑入动画。 |
| 71–100 | `bmnjSections` | BMNJ 的 7 段故事。每段是一句引语加若干段落。第 6、7 段先不标 `lifeStage`。 |
| 103–112 | `navLinks` | 顶栏八个栏目名称。 |
| 114–181 | `SiteHeader` | 深色顶栏：标志、导航、搜索和账户图标。搜索和账户没有行为。 |
| 184–202 | `SiteFooter` | 浅色页脚：标志、版权、三个链接。链接是 `#`。 |
| 205–206 | `JK`、`CG` | Plus Jakarta Sans 和 Cormorant Garamond 的字体栈。 |
| 208–236 | `chapters` | BMNJ 的三个人生阶段：名称、引语、年代、侧栏节点，以及对应 `bmnjSections` 的下标。 |
| 238–338 | `BmnjTimelineSpine` | 故事页左侧粘性时间轴。高亮当前阶段。 |
| 340–429 | `BmnjChapterCard` | 右侧一张阶段卡片：阶段名、引语、该阶段的段落。 |
| 431–698 | `BmnjStoryPage` | 整页 BMNJ 故事：顶栏、大图、导语、时间轴和卡片、返回合集、下一位。下一位按钮没有跳转。 |
| 701 | `hasPlayedSplash` | 模块级标记，让开场动画在同一次加载里只播一次。 |
| 703–798 | `SplashScreen` | 金色全屏，标志像折扇打开，约 4 秒后消失。 |
| 801–865 | `participants` | 9 张人物卡片：代号、地点、引语、照片、是否已有故事。只有 BMNJ 有真实照片。其余 Unsplash 照片不导入，肖像留空。 |
| 867–868 | `latineParticipantIds`、`africanAmericanParticipantIds` | 用代号把人物分进两个合集。华人合集没有名单。 |
| 870–957 | `ParticipantStoryCard` | 合集页上的人物卡片。首页 1994–2058 行是同一张卡片的重复写法，合并成一个组件。没故事时显示 Coming soon；没有肖像时显示代号首字母。 |
| 960–1167 | `ArchiveVolume` | 一本可悬停、可点击的档案书。封面颜色、照片、书名、简介由调用方传入。 |
| 1170 | `CollectionKey` | 三个合集的键。 |
| 1172–1179 | `CollectionCardData` | 合集卡片的字段形状。 |
| 1181–1257 | `collectionPages` | 三个合集的标题、渐变、强调色、书封和空的 `cards`。华人页的画廊读 `cards`，所以现在是空的。 |
| 1259–1473 | `CollectionArchivePage` | 合集页：返回书架、书封、人物网格。拉美和非裔读 `participants`；华人读空的 `cards`。 |
| 1476 | `CGR` | 研究者页使用的衬线字体栈。 |
| 1478–1483 | `repoRows` | 四行研究者表格数据。不移植。 |
| 1485–1792 | `ResearchersPage` | 研究者页，三个标签：文稿下载、学位论文、方法论。方法论正文直接写在组件里。 |
| 1795–2065 | `App` | 默认导出。用 `page` 和 `activeCollection` 在首页、BMNJ、合集、研究者之间切换。首页包含书架、三本书、人物卡片网格和页脚。人物网格并入 `ParticipantStoryCard`。 |

`chapters` 和 `BmnjStoryPage` 用了 `ch.num` 当列表 key，对象上没有这个字段。移植时改用阶段序号或稳定 id。

## 2. 每个组件放到哪里

`App` 的 `useState` 不搬。四个页面各自成为一条路由，原来的 `onNav`、`onBack`、`onOpenStory` 改成 `next/link`。

| 原型 | Next.js 文件 | 路由上的角色 |
| --- | --- | --- |
| `App` 里的书架和人物网格（1841–2062） | `app/(site)/[lang]/page.tsx` | 首页 `/`。服务器组件取合集和故事，把数据传给书架和卡片。 |
| `SplashScreen` | `components/archive/SplashScreen.tsx` | 只在首页挂载。 |
| `ArchiveVolume`，以及 `runArchiveTransition` | `components/archive/ArchiveVolume.tsx`、`components/archive/ArchiveShelf.tsx` | 首页书架和合集页书封共用。书的链接指向 `/stories/collections/[collection]`。 |
| `ParticipantStoryCard`，以及首页 1994–2058 行的重复卡片 | `components/stories/ParticipantCard.tsx` | 合成一个组件。首页和合集页都用它。有肖像显示照片，没有肖像显示代号首字母。链接到 `/stories/[slug]`。 |
| `CollectionArchivePage` | `app/(site)/[lang]/stories/collections/[collection]/page.tsx` | 合集页做在现有路由上。不新建 `/collections`，也不把旧地址改成跳转。 |
| `BmnjStoryPage`、`BmnjTimelineSpine`、`BmnjChapterCard` | `components/stories/StoryDetailView.tsx` | 故事页外观放进已经存在的详情组件。`app/(site)/[lang]/stories/[slug]/page.tsx` 继续负责按 slug 取数据。不要再写一个只认识 BMNJ 的页面。 |
| `FadeSection`、`useFadeIn` | `components/archive/FadeIn.tsx` | 故事导语和阶段卡片使用。 |
| `SiteHeader` | `components/SiteHeader.tsx` | 站点布局 `app/(site)/[lang]/layout.tsx` 已经渲染顶栏。换外观，保留现有栏目链接。 |
| `SiteFooter` | `components/SiteFooter.tsx` | 同样换现有页脚，不新做一个只在原型页出现的页脚。 |
| `ResearchersPage` | `app/(site)/[lang]/research/page.tsx`、`methodology/page.tsx`、`publications/page.tsx` | 不新建 `/researchers`。tab 顺序是 Archive Overview and Access、Research Methodology、Research & Publications，用链接切换。 |

顶栏这些栏目在原型里点了只会回到首页。移植时接到已经存在的页面：

| 栏目 | 地址 |
| --- | --- |
| Home | `/` |
| Interactive Timeline | `/timeline` |
| Share Your Story | `/share-your-story` |
| Participants | `/stories` |
| Our Team | `/about` |
| For Research | `/research` |
| Contact Us | `/contact` |

Rightful Participation 不放进顶栏。Search 和 Account 图标也不放。

故事页顶栏只显示 Home、Participants、Our Team、Contact，这是故事页自己的窄导航，放在 `StoryDetailView` 里。

## 3. 哪些要加 `"use client"`

服务器页面负责取 Sanity 数据。只有用到状态、浏览器 API 或观察视口的部分进客户端组件。

| 文件 | 原因 |
| --- | --- |
| `components/archive/SplashScreen.tsx` | `useState`、`useEffect`、定时器。 |
| `components/archive/FadeIn.tsx` | `IntersectionObserver`。 |
| `components/archive/ArchiveVolume.tsx` | 悬停状态。若改成 CSS `:hover`，书本身可以是服务器组件。 |
| `components/archive/ArchiveShelf.tsx` | 只在还要保留书本之间的 View Transition 时需要。普通 `<Link>` 不需要。 |
| `components/stories/StoryDetailView.tsx` | 已经是客户端组件。滚动时高亮当前人生阶段需要观察器。 |
| `components/research/ResearchNav.tsx` | 已经是客户端组件，只用 `usePathname` 标出当前研究页。三个 tab 是链接，不用 `useState`。 |

这些保持服务器组件：首页、合集页、故事页的 `page.tsx`，以及 `SiteHeader`、`SiteFooter`、`ParticipantCard`。它们只渲染链接和从服务器传入的数据。

`runArchiveTransition` 依赖 `document` 和 `flushSync`，不能放在服务器组件里。Next.js 换路由之后，这个函数没有必要原样搬过来。

## 4. 哪些硬编码改成 Sanity

已经有字段的，页面直接读。

| 原型数据 | Sanity |
| --- | --- |
| `participants` 的代号、地点、引语、是否可阅读 | `story`：`participantCode`、`slug`、`location`、`quotations`、`published`。引语用第一条引语。没有正文的故事显示 Coming soon。除 BMNJ 外，`photographs` 留空，不写入任何 Unsplash 地址。 |
| 两个 `Set` 和合集里的人物名单 | `story.community`，指到 `collection`。不要在代码里按代号分组。 |
| `collectionPages` 的标题、简介、封面、顺序 | `collection`：`name`、`description`、`cover`、`displayOrder`、`slug`。 |
| BMNJ 大图、地点、顶部引语、导语、各段引语和正文 | 同一篇 `story` 的 `photographs`、`location`、`quotations`、`summary`，以及新增的可选分段。任何 slug 都走这条查询。只有 BMNJ 写入真实肖像。 |
| `navLinks` 和页脚三个链接 | `siteSettings.navigation`。没有这项时再用现在的固定栏目。 |

这些是外观，留在代码里：颜色、渐变、字体、书架形状、开场动画、Figma 的 `data-layer-name` 和 `viewTransitionName`、按钮上的 “Read Story” 和 “Coming soon”，以及没有肖像时的首字母占位。

在现有的 `cms/schemaTypes/story.ts` 上加字段，不新建另一套故事类型，也不另建 participant 类型。参与者的代号、地点、引语、可选肖像和所属合集继续用 `story` 上已有的 `participantCode`、`location`、`quotations`、`photographs`、`community`。

`lifeStage` 是共用常量，schema 和前端都从 `cms/schemaTypes/lifeStage.ts` 读取。三个值是 `youth`、`adulthood`、`olderAdulthood`，显示名称是 Youth and Adolescence (-18)、Adulthood (20-59)、Older Adulthood (60+)。

`story.segments` 是可选数组。每段有完整标题 `quote`、可选的时间线短标题 `shortTitle`、Portable Text 的 `body`，以及可选的 `lifeStage`。`lifeStage` 在 Studio 里用单选按钮。留空的段落归到 Other Stories，时间线里也按同样的短标题规则列出。左栏短标题有 `shortTitle` 就用它，否则用 `lib/content/segment-title.ts` 的 `segmentTimelineTitle`：先把 `quote` 做首字母大写并去掉末尾一个句号，再在词边界截到约 8 个词并加省略号。锚点 id 仍由英文 `quote` 生成。不加入原型 `chapters` 的 title、era、nodes，也不加 `timelineChapters`。个人概述用新增的可选 `overview`（多语言 Portable Text）。已有的 `summary` 是纯文本，继续给卡片用，不拿来当故事页概述。BMNJ 第 6、7 段先不填 `lifeStage`，会落在 Other Stories。没有阶段的参与者不套用别人的段落。

`publication` 存作者、年份、标题、期刊或出版社、卷、期、页码、DOI 或链接、排序。前端按 APA 7 拼引用。书目按出版物本身的语言存一份，三种网站语言页面用同一条。

`researchAccessPage` 是单例，给 `/research` 用。三个小节是 Who can use the archive?、Using Data Ethically、Access the Archive，每节有多语言标题和 Portable Text 正文，另加 Google Form 网址和按钮文字。

新字段都可选。文字字段沿用现有的 `localeString`、`localeText`，长文用新的 `localeBlock`（同样是 en / es / zh）。

仍写在代码里的页面文字先只列清单，这一步不改。以后每页一个单例，或扩展现有的 `page` / `siteSettings`。

不导入、也不建文档的内容：

- 除 BMNJ 以外的 Unsplash 人物照片。肖像字段留空。
- `reyesPhoto` 和 `repoRows`。
- 研究者页不再提供文稿直接下载。不放 Google Drive 链接，也不放 “Download All Transcripts (.ZIP)”。访问申请用 `researchAccessPage` 的 Google Form 网址。
- Archive Overview and Access 的三节文字放在 `researchAccessPage`。Research Methodology 的说明，以及 Research & Publications 里论文列表以外的标题，仍在 `lib/content/copy.ts`，随写死文字那一批再迁。论文条目用 `publication`，不要把整句 APA 引用写进代码。
- 学位论文 PDF 不要写进仓库，除非另有可以公开的文件。

## 5. 移植顺序

1. 全局样式和字体。把原型的颜色、字体变量收进 `app/globals.css`，包括没有肖像时的首字母占位。
2. 顶栏和页脚。换 `components/SiteHeader.tsx` 和 `components/SiteFooter.tsx` 的外观。先确认现有栏目还能到时间轴、关于、联系和研究页。
3. Sanity schema。在现有类型上加可选字段，不新建重复的故事或参与者类型。共用 `lifeStage` 常量。`story` 加 `segments`（含可选 `shortTitle`）和可选的 `overview`。新建 `publication` 和单例 `researchAccessPage`。不导入内容，也不改页面。同时列出仍写在代码里的页面文字，先不挪进 Sanity。不给 story 加 elicitation 字段。Elicitation Document 不进入网站。
4. 导入原型内容。BMNJ 写入真实肖像和 7 段正文，第 6、7 段不填 `lifeStage`。其他人只导入代号、地点和引语，肖像留空。不导入 Unsplash 人物照片、`reyesPhoto`、`repoRows`。
5. 首页书架。`app/(site)/[lang]/page.tsx` 读合集和故事。三本书链到 `/stories/collections/[collection]`，slug 用 `latine`、`africanAmerican`、`chinese`。首页现有的三张合集卡已经指向这些地址，保持不动。人物网格只用 `ParticipantCard`。
6. 合集页。在现有的 `app/(site)/[lang]/stories/collections/[collection]/page.tsx` 上做，不新建 `/collections`。卡片仍用 `ParticipantCard`。华人合集没有故事时显示空状态。
7. 通用故事页。所有参与者共用 `app/(site)/[lang]/stories/[slug]/page.tsx` 和 `components/stories/StoryDetailView.tsx`，布局参考 `BmnjStoryPage`、`BmnjTimelineSpine`、`BmnjChapterCard`。不要再写一个只认识 BMNJ 的页面。

   桌面是左右两栏，两栏顶部对齐，从同一高度开始。左栏是时间线，`position: sticky`。往下滚动时固定，`top` 留出和全站顶栏一样的高度，不被顶栏挡住。时间线永远显示三个阶段，名称来自 `lifeStage`：Youth and Adolescence (-18)、Adulthood (20-59)、Older Adulthood (60+)。每个阶段下面按顺序只列该阶段 segments 的短标题，不列正文。短标题用 `segmentTimelineTitle`：有 `shortTitle` 就用，并做首字母大写、去掉末尾一个句号；没有就把 `quote` 先做同样的处理，再在词边界截到约 8 个词并加省略号。Other Stories 用同一条规则。短标题链到该段唯一的锚点。点击或在短标题上按 Enter 后平滑滚动，段落标题停在顶栏下方。跳到的段落有短暂高亮。滚动时，当前段落的短标题高亮，所在阶段自动展开。手机上点完后目录收起。某个阶段没有段落时，阶段名称仍在，显示为灰色。

   右栏最上面是这个人的 `overview`。下面按三个阶段分组，每组有阶段标题，组里是该阶段的每段故事：完整的 `quote` 加 `body`。没有段落的阶段不在右栏出现。没标 `lifeStage` 的段落放在最后一组，标题是 Other Stories。组内顺序沿用 `segments` 数组里的先后。故事区用浅色背景和深色文字。阶段卡片默认可见，不能停在透明度 0。

   网站不展示 Elicitation Document。schema 不加这个字段。Word 导入遇到黄色的 “Elicitation Document” 整节就跳过。还没有 `segments`、暂时用旧全文显示的故事，也要拿掉正文里的 “Elicitation Document” 这一节，从这行标题到下一节标题之前都不显示。

   手机宽度把时间线放到正文上方，并且可以折叠。只有一两段故事时，空阶段在左栏保持灰色，右栏只画出有内容的组和 Other Stories。不用原型 `chapters` 的 title、era、nodes。没有肖像时，大图区域用首字母占位。
8. 研究者页。不新建 `/researchers`。三个 tab 用链接切换，不用 `useState`。顺序是 Archive Overview and Access（`/research`）→ Research Methodology（`/research/methodology`）→ Research & Publications（`/research/publications`）。`/research` 改名为 Archive Overview and Access，读 `researchAccessPage` 的三节：Who can use the archive?、Using Data Ethically、Access the Archive。最后一节的按钮打开 Google Form。删掉所有直接下载文稿的链接，包括 Google Drive 和 “Download All Transcripts (.ZIP)”。Research & Publications 用 `publication` 文档按 APA 7 拼出论文列表，不让编辑手打整条引用。
9. 开场动画。最后加 `SplashScreen`。它依赖定时器和浏览器，放在前面会挡住其余页面的检查。

View Transition 和 “下一位参与者” 不在这九步里。下一位需要合集内的稳定顺序，等卡片和合集页都从 Sanity 读出之后再加。

## 最后清理

这些旧样式现在没有页面使用，先留在 `app/globals.css` 里。移植做完后再删：

- `.siteHeader`
- `.nav`
- `.navLinks`
- `.langSwitch`
- `.footer`
- `.goldBar`

同一块里只给旧顶栏页脚用的 `.brand`、`.navToggle`、`.footerInner`、`.footerLinks` 一起删。

确认合集页人数和改之前一致之后，再删除 story 的 Legacy community 字段（`collection`）和已经写入的旧值。在此之前字段保持隐藏，数据保留。

所有参与者都导入 `segments` 之后，删除 story 的两份旧全文：`body`（Full story (plain text)）和 `article`（Full story）。同时删掉 schema 和已经写入的数据。在此之前，有分段的故事隐藏这两个字段，还没有分段的故事只读显示。

网站、时间线和公开查询都不读 `person` 文档，也不读 story 上的 `participant` 引用。确认旧导入脚本不再创建这些文档之后，删除全部 Participant 文档（`_type == "person"` 且 `roleKind == "participant"`）、每篇 story 上的 `participant` 引用，以及 `person` schema。在此之前，story 里的引用保持隐藏，Studio 左侧不再列出这些文档。

把每一篇 story（草稿和发布版）隐藏的 Title 三个语言 `title.en`、`title.es`、`title.zh` 都回填成该文档的 Participant name or code。网站已经直接显示代号，这一步只是让存着的旧 Title 和代号一致。FRNJ 的旧英文 Title 是引语，回填前先确认这句已经在草稿的 Quotations 里。

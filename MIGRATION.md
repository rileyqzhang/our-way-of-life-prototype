# Figma Make 原型移植说明

来源是 `_prototype/src/App.tsx`（2065 行）。页面切换靠 `App` 里的 `useState`，内容写在这个文件里。这一步只定移植方案，不改页面代码。

现有站点是 Next.js App Router，内容经 `getArchive()` 读 Sanity。所有路由文件都放在 `app/(site)/[lang]/` 下。`middleware.ts` 会把没有语言前缀的路径转到 `/en`：访问 `/` 会到 `/en`，访问 `/stories/bmnj` 会到 `/en/stories/bmnj`。下面写的地址是去掉语言前缀之后的样子。

目标路由：

| 地址 | 文件 |
| --- | --- |
| `/` | `app/(site)/[lang]/page.tsx` |
| `/stories/[slug]` | `app/(site)/[lang]/stories/[slug]/page.tsx` |
| `/collections/[key]` | `app/(site)/[lang]/collections/[key]/page.tsx` |
| `/researchers` | `app/(site)/[lang]/researchers/page.tsx` |

`[key]` 沿用现有合集 slug：`latine`、`africanAmerican`、`chinese`。现在的合集地址是 `/stories/collections/[collection]`，移植时改为 `/collections/[key]`，旧地址再做跳转。

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
| `ArchiveVolume`，以及 `runArchiveTransition` | `components/archive/ArchiveVolume.tsx`、`components/archive/ArchiveShelf.tsx` | 首页书架和合集页书封共用。书的链接指向 `/collections/[key]`。 |
| `ParticipantStoryCard`，以及首页 1994–2058 行的重复卡片 | `components/stories/ParticipantCard.tsx` | 合成一个组件。首页和合集页都用它。有肖像显示照片，没有肖像显示代号首字母。链接到 `/stories/[slug]`。 |
| `CollectionArchivePage` | `app/(site)/[lang]/collections/[key]/page.tsx` | 合集页。现有 `stories/collections/[collection]/page.tsx` 改为跳到新地址。 |
| `BmnjStoryPage`、`BmnjTimelineSpine`、`BmnjChapterCard` | `components/stories/StoryDetailView.tsx` | 故事页外观放进已经存在的详情组件。`app/(site)/[lang]/stories/[slug]/page.tsx` 继续负责按 slug 取数据。不要再写一个只认识 BMNJ 的页面。 |
| `FadeSection`、`useFadeIn` | `components/archive/FadeIn.tsx` | 故事导语和阶段卡片使用。 |
| `SiteHeader` | `components/SiteHeader.tsx` | 站点布局 `app/(site)/[lang]/layout.tsx` 已经渲染顶栏。换外观，保留现有栏目链接。 |
| `SiteFooter` | `components/SiteFooter.tsx` | 同样换现有页脚，不新做一个只在原型页出现的页脚。 |
| `ResearchersPage` | `app/(site)/[lang]/researchers/page.tsx`，标签交互放 `components/research/ResearchersTabs.tsx` | 新的 `/researchers`。现有 `/research`、`/research/publications`、`/research/methodology` 保留为跳转，避免旧链接失效。 |

顶栏这些栏目在原型里点了只会回到首页。移植时接到已经存在的页面：

| 栏目 | 地址 |
| --- | --- |
| Home | `/` |
| Interactive Timeline | `/timeline` |
| Share Your Story | `/share-your-story` |
| Participants | `/stories` |
| Our Team | `/about` |
| Rightful Participation | 先链到现有对应页面；没有独立页面之前不要做空路由 |
| For Research | `/researchers` |
| Contact Us | `/contact` |

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
| `components/research/ResearchersTabs.tsx` | 三个标签的 `useState`。 |

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

在现有的 `cms/schemaTypes/story.ts` 上加字段，不新建另一套故事类型。分段列表里的 `lifeStage` 是可选的，取值对应原型的三个人生阶段：`youth`、`adulthood`、`older`。BMNJ 前 5 段按 `chapters` 写入阶段，第 6、7 段照样导入正文和引语，但 `lifeStage` 留空，等教授确认后再填。时间轴先排有 `lifeStage` 的段，没有的一律排在最后。没有阶段的参与者不套用 BMNJ 的三章。

不导入、也不建文档的内容：

- 除 BMNJ 以外的 Unsplash 人物照片。肖像字段留空。
- `reyesPhoto` 和 `repoRows`。
- 研究者页的方法论长文、学位论文标题和两段说明。现在在 `lib/content/copy.ts` 和三个研究页面里。`page` 文档只有标题、摘要和正文，装不下这四节结构。第一轮继续用现有文案。
- 两个 Google Drive 地址。文稿下载继续读 `NEXT_PUBLIC_RESEARCH_DOC_URL`。学位论文链接不要写进仓库；需要公开地址时再加一个同样只在服务端或公开环境变量里配置的项。

## 5. 移植顺序

1. 全局样式和字体。把原型的颜色、字体变量收进 `app/globals.css`，包括没有肖像时的首字母占位。
2. 顶栏和页脚。换 `components/SiteHeader.tsx` 和 `components/SiteFooter.tsx` 的外观。先确认现有栏目还能到时间轴、关于、联系和研究页。
3. Sanity schema。只改 `cms/schemaTypes/story.ts`，加上可选分段和可选 `lifeStage`。不新建重复的故事类型。
4. 导入原型内容。BMNJ 写入真实肖像和 7 段正文，第 6、7 段不填 `lifeStage`。其他人只导入代号、地点和引语，肖像留空。不导入 Unsplash 人物照片、`reyesPhoto`、`repoRows`。
5. 首页书架。`app/(site)/[lang]/page.tsx` 读合集和故事。三本书链到 `/collections/[key]`，人物网格只用 `ParticipantCard`。
6. 合集页。新增 `app/(site)/[lang]/collections/[key]/page.tsx`，卡片仍用 `ParticipantCard`。旧的 `app/(site)/[lang]/stories/collections/[collection]/page.tsx` 跳到新地址。华人合集没有故事时显示空状态。
7. 通用故事页。改 `app/(site)/[lang]/stories/[slug]/page.tsx` 和 `components/stories/StoryDetailView.tsx`。有 `lifeStage` 的段按阶段排，没有的排在时间轴最后。没有肖像时，大图区域也用首字母占位。
8. 研究者页。新增 `app/(site)/[lang]/researchers/page.tsx`。三个标签先用现有研究页文案。旧的 `/research` 地址跳过来。
9. 开场动画。最后加 `SplashScreen`。它依赖定时器和浏览器，放在前面会挡住其余页面的检查。

View Transition 和 “下一位参与者” 不在这九步里。下一位需要合集内的稳定顺序，等卡片和合集页都从 Sanity 读出之后再加。

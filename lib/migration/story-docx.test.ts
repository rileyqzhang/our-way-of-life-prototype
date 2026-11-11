import assert from "node:assert/strict";
import test from "node:test";
import { applyParticipantCode, lifeStageForGroup, parseStoryHtml, titleFromFirstSentence, wordCount } from "@/lib/migration/story-docx";

const sample = `
<p><strong>BMNJ6 Narrative</strong></p>
<p><strong>“…<em>to me this is part of the human experience.</em> We live here together.”</strong></p>
<p>BMNJ was born in Manhattan in 1954 and grew up in Harlem.</p>
<p><mark>Elicitation Document</mark></p>
<p>Skip this photo description [FOR BM TO CLARIFY].</p>
<p><mark>What is civic participation (CP)?</mark></p>
<p><strong><u>Story 1:</u></strong> <em>“You call it civic participation.”</em></p>
<p>I'd call what I do civic participation. <strong>Everybody</strong> can help.</p>
<p><mark>Stories of CP from childhood</mark></p>
<p><strong><u>Story 1:</u></strong> <em>“realizing the struggle.”</em></p>
<p>My parents were aware of the struggle. <mark>It had been maybe the fourth grade. I was pulled out of that school activity</mark></p>
<p><mark>Stories of CP from young adulthood</mark></p>
<p><strong><u>Story 1:</u></strong> <em>“You couldn’t be there and not soak it up”</em></p>
<p>We have a [unintelligible 00:40:47] FOR BM TO CLARIFY around us.</p>
<p><mark>Stories of CP from adulthood</mark></p>
<p><strong><u>Story 1:</u></strong> <em>“everybody has something to give”</em></p>
<p>These experiences are many.</p>
<p><mark>Stories of CP from later life</mark></p>
<p><strong><u>Story 2:</u></strong> A win to restore the vote</p>
<p>I am still organizing.</p>
<p><mark>The cost of participation</mark></p>
<p><strong><u>Story 1:</u></strong> <em>“I've missed a lot of family functions.”</em></p>
<p>The work takes time. We [NAACP] keep going.</p>
`;

test("highlighted groups become life stages and elicitation text is left out", () => {
  const plan = parseStoryHtml(sample);
  assert.equal(plan.headline, "“…to me this is part of the human experience. We live here together.”");
  assert.match(plan.overviewText, /^BMNJ was born in Manhattan in 1954/);
  assert.equal(plan.overviewText.includes("Elicitation"), false);
  assert.equal(plan.overviewText.includes("Skip this photo"), false);
  assert.deepEqual(
    plan.segments.map((segment) => [segment.index, segment.group, segment.lifeStage, segment.title]),
    [
      [1, "What is civic participation (CP)?", "", "You call it civic participation."],
      [2, "Stories of CP from childhood", "youth", "realizing the struggle."],
      [3, "Stories of CP from young adulthood", "youth", "You couldn’t be there and not soak it up"],
      [4, "Stories of CP from adulthood", "adulthood", "everybody has something to give"],
      [5, "Stories of CP from later life", "olderAdulthood", "A win to restore the vote"],
      [6, "The cost of participation", "", "I've missed a lot of family functions."],
    ],
  );
  assert.deepEqual(
    plan.segments.map((segment) => segment.words),
    [
      wordCount("I'd call what I do civic participation. Everybody can help."),
      wordCount("My parents were aware of the struggle. It had been maybe the fourth grade. I was pulled out of that school activity"),
      wordCount("We have a […] around us."),
      wordCount("These experiences are many."),
      wordCount("I am still organizing."),
      wordCount("The work takes time. We [NAACP] keep going."),
    ],
  );
});

test("editorial notes are cleaned and body highlights are listed without group headings", () => {
  const plan = parseStoryHtml(sample);
  const marks = plan.segments[0].body[0].children.map((span) => [span.text.trim(), span.marks]);
  assert.deepEqual(marks.filter((item) => item[0]), [
    ["I'd call what I do civic participation.", []],
    ["Everybody", ["strong"]],
    ["can help.", []],
  ]);
  assert.equal(plan.segments[2].body.map((block) => block.children.map((span) => span.text).join("")).join(" "), "We have a […] around us.");
  assert.equal(plan.segments[5].body.map((block) => block.children.map((span) => span.text).join("")).join(" ").includes("[NAACP]"), true);
  assert.deepEqual(
    plan.noteEdits.map((edit) => [edit.where, edit.before, edit.after]),
    [
      ["segment 3", "[unintelligible 00:40:47]", "[…]"],
      ["segment 3", "FOR BM TO CLARIFY", ""],
    ],
  );
  assert.deepEqual(plan.highlights, [
    { where: "segment 2", text: "It had been maybe the fourth grade. I was pulled out of that school activity" },
  ]);
});

test("adjacent highlight runs are read as one phrase", () => {
  const plan = parseStoryHtml(`
    <p><strong>A long enough opening quotation for the headline text.</strong></p>
    <p>Overview.</p>
    <p><mark>Stories of CP from childhood</mark></p>
    <p><strong><u>Story 1:</u></strong> <em>“A title.”</em></p>
    <p>Leaders of <strong><mark>a group</mark></strong> <mark>[</mark><strong><mark>FOR BM TO CLARIFY</mark></strong><mark>]</mark> became friends.</p>
  `);
  assert.deepEqual(plan.highlights, [{ where: "segment 1", text: "a group [FOR BM TO CLARIFY]" }]);
  assert.equal(plan.segments[0].body.map((block) => block.children.map((span) => span.text).join("")).join(" "), "Leaders of a group became friends.");
});

test("clarify notes for any participant code and Spanish hearing marks are cleaned", () => {
  const plan = parseStoryHtml(`
    <p><strong>A long enough opening quotation for the headline.</strong></p>
    <p>Overview.</p>
    <p><mark>Stories of CP from childhood</mark></p>
    <p><strong>Story 1:</strong> A title</p>
    <p>Please [FOR ET TO CLARIFY] check [inaudible 01:20:26] and [ininteligible].</p>
  `);
  assert.equal(
    plan.segments[0].body.map((block) => block.children.map((span) => span.text).join("")).join(" "),
    "Please check […] and […].",
  );
  assert.deepEqual(
    plan.noteEdits.map((edit) => [edit.before, edit.after]),
    [
      ["[FOR ET TO CLARIFY]", ""],
      ["[inaudible 01:20:26]", "[…]"],
      ["[ininteligible]", "[…]"],
    ],
  );
});

test("known group names map to life stages and other names stay empty", () => {
  assert.equal(lifeStageForGroup("Stories of CP from childhood"), "youth");
  assert.equal(lifeStageForGroup("Stories of CP from young adulthood"), "youth");
  assert.equal(lifeStageForGroup("Stories of CP from adulthood (21-59)"), "adulthood");
  assert.equal(lifeStageForGroup("Stories of CP from later life"), "olderAdulthood");
  assert.equal(lifeStageForGroup("Historias de la niñez"), "youth");
  assert.equal(lifeStageForGroup("Early Childhood- La Niñez (MAX 12 YEARS)"), "youth");
  assert.equal(lifeStageForGroup("Siendo de la tercera edad"), "olderAdulthood");
  assert.equal(lifeStageForGroup("Later Life – La edad avanzada"), "olderAdulthood");
  assert.equal(lifeStageForGroup("The cost of participation"), "");
  assert.equal(lifeStageForGroup("Significado de poder ayudar"), "");
});

test("story headings are recognized without a highlight, including split and fullwidth forms", () => {
  const plan = parseStoryHtml(`
    <p><strong>“A quoted headline for the opening.”</strong></p>
    <p>Overview of the life.</p>
    <p>FRNJ6 Elicitation</p>
    <p>Skip this elicitation paragraph.</p>
    <p>Historias de la niñez</p>
    <p>Historia 1: “Una historia.”</p>
    <p>El cuerpo.</p>
    <p>S tory 2. “A repaired title.”</p>
    <p>Repaired body.</p>
    <p>Stories of CP from later life (60+） Story1：下一句</p>
    <p>后来的正文。</p>
    <p>故事一 童年的事</p>
    <p>中文正文。</p>
  `);
  assert.equal(plan.overviewText.includes("Skip this elicitation"), false);
  assert.deepEqual(
    plan.segments.map((segment) => [segment.lifeStage, segment.title]),
    [
      ["youth", "Una historia."],
      ["youth", "A repaired title."],
      ["olderAdulthood", "下一句"],
      ["olderAdulthood", "童年的事"],
    ],
  );
});

test("a paragraph left outside a story is kept and listed", () => {
  const plan = parseStoryHtml(`
    <p><strong>“Headline for the outside paragraph test.”</strong></p>
    <p>Overview.</p>
    <p>Stories of CP from adulthood</p>
    <p>This paragraph had no story number.</p>
    <p>Stories of CP from later life</p>
    <p>Story 1: A later story</p>
    <p>Later body.</p>
  `);
  assert.equal(plan.outside.length, 1);
  assert.match(plan.outside[0].text, /no story number/);
  assert.equal(plan.segments.some((segment) => segment.body.some((block) => block.children.some((child) => /no story number/.test(child.text)))), true);
});

test("a story with no headings stays one segment and a label is not the headline", () => {
  const plan = parseStoryHtml(`
    <p><strong>CSSF6 Narrative</strong></p>
    <p>“我觉得不能牺牲我喜欢的活动，剩下的时间我会去帮助别人。” A good Quote</p>
    <p>Summary: CSSF6 是一位温和的长者，住在旧金山。</p>
    <p>退休以后她仍然参加社区的活动，并且帮助邻居。</p>
  `);
  assert.match(plan.headline, /不能牺牲我喜欢的活动/);
  assert.equal(plan.headline.includes("Narrative"), false);
  assert.equal(plan.headline.includes("A good Quote"), false);
  assert.equal(plan.unsplit, true);
  assert.equal(plan.segments.length, 1);
});

test("a caption with a comma stays inside the current life stage", () => {
  const plan = parseStoryHtml(`
    <p><strong>“A quoted headline.”</strong></p>
    <p>Overview.</p>
    <p>Stories of CP from later life</p>
    <p>Story 1: The health group</p>
    <p>这张照片是在书上的，2016年的合照</p>
    <p>Story 2: The next story</p>
    <p>Body.</p>
  `);
  assert.deepEqual(plan.unmatchedGroups, []);
  assert.deepEqual(
    plan.segments.map((segment) => segment.lifeStage),
    ["olderAdulthood", "olderAdulthood"],
  );
});

test("an unrecognized group heading does not keep the previous life stage", () => {
  const plan = parseStoryHtml(`
    <p><strong>“A quoted headline.”</strong></p>
    <p>Overview.</p>
    <p>Stories of CP from adulthood</p>
    <p>Story 1: Known stage</p>
    <p>Body of the known stage.</p>
    <p>Neighborhood Context</p>
    <p>Story 2: Should not stay adult</p>
    <p>Body of the unmatched group.</p>
  `);
  assert.deepEqual(plan.unmatchedGroups, ["Neighborhood Context"]);
  assert.deepEqual(
    plan.segments.map((segment) => [segment.lifeStage, segment.title]),
    [
      ["adulthood", "Known stage"],
      ["", "Should not stay adult"],
    ],
  );
});

test("short story titles under a known stage stay in that stage", () => {
  const paragraph = "Esta es una historia larga sobre la vida actual y la comunidad donde participa. ";
  const plan = parseStoryHtml(`
    <p>Later Life – La edad avanzada (60+)</p>
    <p>Contexto Actual</p>
    <p>${paragraph.repeat(3)}</p>
    <p>Fe en Acción</p>
    <p>${paragraph.repeat(3)}</p>
  `);
  assert.deepEqual(plan.unmatchedGroups, []);
  assert.equal(plan.segments.length, 2);
  assert.equal(plan.segments.every((segment) => segment.lifeStage === "olderAdulthood"), true);
});

test("a narrative heading ends an elicitation skip and keeps the biography", () => {
  const plan = parseStoryHtml(`
    <p>FRNJ6 Elicitation</p>
    <p>This elicitation paragraph should be skipped.</p>
    <p>FRNJ6 Narrative</p>
    <p>FRNJ was born in 1945 in Florida and later moved to New Jersey.</p>
    <p>Stories of CP from childhood</p>
    <p>Story 1: The housing project</p>
    <p>I grew up in a housing project.</p>
  `);
  assert.match(plan.overviewText, /FRNJ was born in 1945/);
  assert.equal(plan.overviewText.includes("elicitation"), false);
  assert.deepEqual(plan.segments.map((segment) => segment.title), ["The housing project"]);
});

test("an art or photo heading is skipped until the next life stage", () => {
  const plan = parseStoryHtml(`
    <p>Descripción de arte</p>
    <p>Lo que yo trabajé es una creación hecha en un trozo de madera rústico.</p>
    <p>Ejercicio Creativo</p>
    <p>Fotografías de los proyectos en Michoacán: La Calle del Corral</p>
    <p>La persona que está encargada tomó estas fotos.</p>
    <p>Early Childhood- La Niñez</p>
    <p>Nací hace más de 70 años en El Salvador.</p>
  `);
  assert.equal(plan.overviewText, "");
  assert.equal(plan.headline, "");
  assert.equal(plan.segments.some((segment) => segment.body.some((block) => block.children.some((child) => /trozo de madera|Fotografías|estas fotos/.test(child.text)))), false);
  assert.match(plan.segments.map((segment) => segment.body.map((block) => block.children.map((child) => child.text).join("")).join(" ")).join(" "), /Nací hace más de 70 años/);
});

test("a closing heading stays its own segment in the current stage", () => {
  const body = "Para mí sería involucrarse en organizaciones que ayudan a la comunidad y seguir participando. ";
  const plan = parseStoryHtml(`
    <p>Later Life – La edad avanzada (60+)</p>
    <p>Contexto Actual</p>
    <p>${"Tengo 81 años y vivo sola en San Francisco desde hace muchos años. ".repeat(2)}</p>
    <p>Reflexiones y Consejos</p>
    <p>El rol de la comunidad que tienen las personas de mayor edad</p>
    <p>${body.repeat(2)}</p>
  `);
  assert.deepEqual(
    plan.segments.map((segment) => [segment.lifeStage, segment.title]),
    [
      ["olderAdulthood", "Contexto Actual"],
      ["olderAdulthood", "Reflexiones y Consejos"],
      ["olderAdulthood", "El rol de la comunidad que tienen las personas de mayor edad"],
    ],
  );
  const reflexiones = plan.segments[1].body.map((block) => block.children.map((child) => child.text).join("")).join(" ");
  assert.equal(reflexiones.includes("Para mí"), false);
});

test("an interview question glued to a group heading is removed from the heading", () => {
  const plan = parseStoryHtml(`
    <p>Adulthood- Adulto Alguna otra cosa que quiera agregar de su tiempo antes de perder la vista?</p>
    <p>Cuando tenía 21 años vine por primera vez.</p>
  `);
  assert.equal(plan.segments[0]?.group, "Adulthood- Adulto");
  assert.equal(plan.segments[0]?.lifeStage, "adulthood");
  assert.match(plan.segments[0].body.map((block) => block.children.map((child) => child.text).join("")).join(" "), /Cuando tenía 21 años/);
});

test("a standalone interview question is removed when the answer stands on its own", () => {
  const answer = "Es muy importante involucrarse y estar activa porque si uno no está activo uno no sabe dónde vive ni qué pasa afuera de la casa. ";
  const plan = parseStoryHtml(`
    <p><strong>“A quoted headline.”</strong></p>
    <p>Overview.</p>
    <p>Stories of CP from later life</p>
    <p>Story 1: Why she participates</p>
    <p>¿Por qué participa?</p>
    <p>${answer}</p>
    <p>Me ha ayudado a ser independiente.</p>
  `);
  const body = plan.segments[0].body.map((block) => block.children.map((child) => child.text).join("")).join(" ");
  assert.equal(body.includes("Por qué participa"), false);
  assert.match(body, /Es muy importante involucrarse/);
  assert.match(body, /Me ha ayudado a ser independiente/);
  assert.equal(plan.edits.some((edit) => edit.kind === "deleted-prompt"), true);
});

test("a short answer keeps the interview question", () => {
  const plan = parseStoryHtml(`
    <p>Stories of CP from later life</p>
    <p>Story 1: A short reply</p>
    <p>¿Por qué participa?</p>
    <p>Porque me gusta.</p>
  `);
  const body = plan.segments[0].body.map((block) => block.children.map((child) => child.text).join("")).join(" ");
  assert.match(body, /Por qué participa/);
  assert.equal(plan.edits.some((edit) => edit.kind === "kept-prompt"), true);
});

test("an add-on title becomes the first sentence", () => {
  const plan = parseStoryHtml(`
    <p>Later Life – La edad avanzada</p>
    <p>Algo que añadir: parte 1</p>
    <p>Hago o ayudo. Quizás ayudó a entender a las personas cuando preguntan por su salud y sus dudas.</p>
  `);
  assert.equal(plan.segments[0].title, "Hago o ayudo.");
  assert.equal(plan.edits.some((edit) => edit.kind === "generated-title" && edit.reason.includes("需人工检查")), true);
});

test("a generated title keeps about twelve words, drops a trailing comma, and adds an ellipsis", () => {
  const plan = parseStoryHtml(`
    <p>Later Life – La edad avanzada</p>
    <p>Algo que añadir: parte 2</p>
    <p>Uno dos tres cuatro cinco seis siete ocho nueve diez once doce, trece palabras siguen aqui.</p>
  `);
  assert.equal(plan.segments[0].title, "Uno dos tres cuatro cinco seis siete ocho nueve diez once doce…");
});

test("a long Chinese sentence is shortened to about twelve words", () => {
  assert.equal(
    titleFromFirstSentence("我觉得跳舞的组，邻居家人，还有一个工友，还有一个老年中心认识一个朋友，我们平时会一起吃吃饭，是我社区的一部分。"),
    "我觉得跳舞的组，邻居家人，还有一个工友，还有一个老年中心认识一个朋友，我们平时会…",
  );
});

test("an ASK clarify note is removed the same way as a FOR clarify note", () => {
  const plan = parseStoryHtml(`
    <p>Stories of CP from adulthood</p>
    <p>Story 1: A title</p>
    <p>The officer came to the meeting. ASK SENJ6 TO CLARIFY . He asked me to continue with the group.</p>
  `);
  assert.equal(
    plan.segments[0].body.map((block) => block.children.map((span) => span.text).join("")).join(" "),
    "The officer came to the meeting. He asked me to continue with the group.",
  );
});

test("the interview questions left in the stored drafts are recognized and removed", () => {
  const answer = "Nos sentimos en el mismo terreno y estas personas están muy capacitadas porque saben manejar el teléfono mejor que una persona que puede ver.";
  const plan = parseStoryHtml(`
    <p>Later Life – La edad avanzada</p>
    <p>Story 1: Cambios en la participación a través del tiempo</p>
    <p>¿Cómo se siente poder tener una comunidad de personas que también son ciegos?</p>
    <p>${answer}</p>
    <p>Story 2: Asesoramiento de medicina / salud alternativa</p>
    <p>Me puede decir cuando es que haces estos convivios?</p>
    <p>En las iglesias hacemos muchos convivios y la gente tiene que involucrarse para dar la bienvenida a las personas que llegan.</p>
    <p>Story 3: Cambios en la participación a través del tiempo</p>
    <p>Algo que quiera agregar de como a cambiado su participación atreves de los años?</p>
    <p>Story 4: La importancia de contribuir en la comunidad</p>
    <p>¿Qué apoyos usted cree que les serviría a las personas de mayor edad para ayudarlas a que se mantengan activas e involucradas?</p>
    <p>Hay bastantes recursos que da el condado y el que no lo quiera aprovechar no quiere participar, pero la mesa está servida.</p>
    <p>Story 5: Apoyos necesarios para promover participación</p>
    <p>¿Qué consejo usted le daría a la gente sobre la importancia de involucrarse y contribuir en la comunidad?</p>
    <p>Le aconsejaría participar porque la información es muy importante y uno aprende cada día cuando está involucrado.</p>
  `);
  const body = plan.segments.map((segment) => segment.body.map((block) => block.children.map((span) => span.text).join("")).join(" ")).join("\n");
  assert.equal(body.includes("Cómo se siente"), false);
  assert.equal(body.includes("Me puede decir"), false);
  assert.equal(body.includes("Algo que quiera agregar"), false);
  assert.equal(body.includes("Qué apoyos usted cree"), false);
  assert.equal(body.includes("Qué consejo usted"), false);
  assert.match(body, /Nos sentimos en el mismo terreno/);
});

test("a quotation glued to a group heading becomes the first story title", () => {
  const plan = parseStoryHtml(`
    <p>¿Qué es la participación cívica? “yo lo hago por amor, por misericordia”</p>
    <p>No es una frase que haya oído mucho, pero lo hago por amor.</p>
    <p>Historias de la niñez</p>
    <p>Historia 1: Éramos pobres</p>
    <p>Había mucha necesidad.</p>
  `);
  assert.equal(plan.segments[0].group, "¿Qué es la participación cívica?");
  assert.equal(plan.segments[0].title, "yo lo hago por amor, por misericordia");
  assert.equal(plan.segments[1].title, "Éramos pobres");
});

test("a story heading that is really the whole paragraph becomes body text with a generated title", () => {
  const prose = "My Church is mostly black, but we join in with this other church. Reverend Duncan was in charge of the outreach.";
  const plan = parseStoryHtml(`
    <p>Stories of CP from later life</p>
    <p>Story 2. ${prose}</p>
  `);
  assert.equal(plan.segments[0].lifeStage, "olderAdulthood");
  assert.equal(plan.segments[0].isQuote, false);
  assert.equal(plan.segments[0].title, titleFromFirstSentence(prose));
  assert.match(plan.segments[0].body.map((block) => block.children.map((span) => span.text).join("")).join(" "), /Reverend Duncan/);
  assert.equal(plan.edits.some((edit) => edit.kind === "generated-title" && edit.reason.includes("需人工检查")), true);
});

test("a quoted title with more than one sentence stays the title when the body is separate", () => {
  const plan = parseStoryHtml(`
    <p>Stories of CP from adulthood</p>
    <p>Story 1: “It's being flexible. The best way to learn is to listen.”</p>
    <p>Civic participation means you put up some work effort in the community and try to address the needs you see.</p>
  `);
  assert.equal(plan.segments[0].title, "It's being flexible. The best way to learn is to listen.");
  assert.equal(plan.segments[0].isQuote, true);
});

test("a label or a short heading glued to the following paragraph is split into the title", () => {
  const plan = parseStoryHtml(`
    <p>Stories of CP from childhood</p>
    <p>Story 1: Placeholder</p>
    <p>This numbered story keeps the later short lines from being treated as ordinary subheadings.</p>
    <p>Stories of CP from adulthood</p>
    <p>故事：忙于家庭和工作没有余力</p>
    <p>我五十岁时和兄弟姐妹一起搬来美国，先住在Chicago之后搬到Oakland。搬来美国前要工作和照顾孩子，没有余力参加别的活动。</p>
    <p>Stories of CP from later life</p>
    <p>从中国到美国，以自己的方式为国家和社区做贡献</p>
    <p>65年到98年来美国之前我先搞文艺再做生意。改革开放从广东开始建设，那个时候办工厂和搞贸易的人不多，大家都没有做生意的经验。</p>
    <p>The cost of participation</p>
    <p>给身边人建议：</p>
    <p>我们老年公寓的口号是参与就是健康。老年人参加任何一个组都可以帮助摆脱孤单，来这里住的人会慢慢融入每周的活动。</p>
  `);
  assert.deepEqual(plan.segments.slice(1).map((segment) => segment.title), [
    "忙于家庭和工作没有余力",
    "从中国到美国，以自己的方式为国家和社区做贡献",
    "给身边人建议",
  ]);
  const bodies = plan.segments.slice(1).map((segment) => segment.body.map((block) => block.children.map((span) => span.text).join("")).join(" "));
  assert.match(bodies[0], /^我五十岁时/);
  assert.match(bodies[1], /^65年到98年/);
  assert.match(bodies[2], /^我们老年公寓的口号/);
});

test("a paragraph that is only a placeholder does not become a segment", () => {
  const plan = parseStoryHtml(`
    <p>Stories of CP from childhood</p>
    <p>N/A</p>
    <p>Stories of CP from adulthood</p>
    <p>Story 1: A real title</p>
    <p>This story has a real paragraph after the placeholder, so the placeholder line is left out.</p>
    <p>n/a</p>
  `);
  assert.equal(plan.segments.some((segment) => segment.body.some((block) => /n\/a/i.test(block.children.map((span) => span.text).join("")))), false);
  assert.equal(plan.segments.some((segment) => segment.title === "N/A"), false);
  assert.equal(plan.segments.at(-1)?.title, "A real title");
});

test("the participant code loses its numeric suffix only in the headline and overview", () => {
  const plan = applyParticipantCode(parseStoryHtml(`
    <p><strong>“HSNJ6 said this in 1941.”</strong></p>
    <p>HSNJ6 was born in 1941.</p>
    <p>Stories of CP from childhood</p>
    <p>Story 1: A year in 1941</p>
    <p>HSNJ6 turned 10 in 1951.</p>
  `), "HSNJ");
  assert.equal(plan.headline, "“HSNJ said this in 1941.”");
  assert.match(plan.overviewText, /^HSNJ was born in 1941/);
  const body = plan.segments[0].body.map((block) => block.children.map((child) => child.text).join("")).join(" ");
  assert.match(body, /HSNJ6 turned 10 in 1951/);
});

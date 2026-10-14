/**
 * JSON 解析器 — 处理普通 JSON、转义字符与多重编码字符串
 */

const $ = (id) => document.getElementById(id);

const inputEl = $("input");
const outputEl = $("output");
const statusEl = $("status");
const btnCopy = $("btnCopy");
const btnExpand = $("btnExpand");
const btnCollapse = $("btnCollapse");

/** 当前用于复制的文本 */
let copyText = "";

function setStatus(message, type) {
  statusEl.hidden = !message;
  statusEl.textContent = message || "";
  statusEl.className = "status" + (type ? ` ${type}` : "");
}

function setTreeActionsEnabled(enabled) {
  btnExpand.disabled = !enabled;
  btnCollapse.disabled = !enabled;
}

function clearOutput() {
  outputEl.replaceChildren();
  copyText = "";
  btnCopy.disabled = true;
  setTreeActionsEnabled(false);
}

function setPlainOutput(text) {
  outputEl.replaceChildren();
  if (text) {
    const pre = document.createElement("pre");
    pre.className = "output-plain";
    pre.textContent = text;
    outputEl.appendChild(pre);
  }
  copyText = text || "";
  btnCopy.disabled = !copyText;
  setTreeActionsEnabled(false);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrimitive(value) {
  if (value === null) {
    return { html: '<span class="tree-null">null</span>', preview: "null" };
  }
  switch (typeof value) {
    case "string":
      return {
        html: `<span class="tree-string">${escapeHtml(JSON.stringify(value))}</span>`,
        preview: JSON.stringify(value),
      };
    case "number":
      return {
        html: `<span class="tree-number">${escapeHtml(String(value))}</span>`,
        preview: String(value),
      };
    case "boolean":
      return {
        html: `<span class="tree-boolean">${value ? "true" : "false"}</span>`,
        preview: value ? "true" : "false",
      };
    default:
      return {
        html: `<span>${escapeHtml(String(value))}</span>`,
        preview: String(value),
      };
  }
}

function containerPreview(value) {
  if (Array.isArray(value)) {
    return value.length ? `[…] ${value.length} 项` : "[]";
  }
  if (value && typeof value === "object") {
    const n = Object.keys(value).length;
    return n ? `{…} ${n} 键` : "{}";
  }
  return "";
}

/**
 * 构建可折叠树节点。默认展开（不带 is-collapsed）。
 */
function createTreeNode(key, value, isRoot = false) {
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object";
  const node = document.createElement("div");
  node.className = "tree-node";

  const line = document.createElement("div");
  line.className = "tree-line";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "tree-toggle";
  toggle.setAttribute("aria-label", "展开/收起");

  if (!isObject) {
    toggle.classList.add("is-leaf");
    toggle.textContent = "•";
    toggle.tabIndex = -1;

    let html = "";
    if (!isRoot && key !== undefined) {
      const keyLabel =
        typeof key === "number" ? String(key) : JSON.stringify(String(key));
      html += `<span class="tree-key">${escapeHtml(keyLabel)}</span>`;
      html += `<span class="tree-colon">:</span>`;
    }
    html += formatPrimitive(value).html;
    line.appendChild(toggle);
    const content = document.createElement("span");
    content.innerHTML = html;
    line.appendChild(content);
    node.appendChild(line);
    return node;
  }

  const entries = isArray
    ? value.map((item, i) => [i, item])
    : Object.keys(value).map((k) => [k, value[k]]);

  const open = isArray ? "[" : "{";
  const close = isArray ? "]" : "}";

  toggle.textContent = "▼";
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const collapsed = node.classList.toggle("is-collapsed");
    toggle.textContent = collapsed ? "▶" : "▼";
  });

  let headHtml = "";
  if (!isRoot && key !== undefined) {
    const keyLabel =
      typeof key === "number" ? String(key) : JSON.stringify(String(key));
    headHtml += `<span class="tree-key">${escapeHtml(keyLabel)}</span>`;
    headHtml += `<span class="tree-colon">:</span>`;
  }
  headHtml += `<span class="tree-punct">${open}</span>`;
  if (entries.length === 0) {
    headHtml += `<span class="tree-punct">${close}</span>`;
    toggle.classList.add("is-leaf");
    toggle.textContent = "•";
    toggle.tabIndex = -1;
  } else {
    headHtml += `<span class="tree-preview">${escapeHtml(containerPreview(value))}</span>`;
  }

  line.appendChild(toggle);
  const head = document.createElement("span");
  head.innerHTML = headHtml;
  line.appendChild(head);
  node.appendChild(line);

  if (entries.length > 0) {
    const children = document.createElement("div");
    children.className = "tree-children";
    for (const [childKey, childVal] of entries) {
      children.appendChild(createTreeNode(childKey, childVal, false));
    }

    const closeLine = document.createElement("div");
    closeLine.className = "tree-line";
    const spacer = document.createElement("button");
    spacer.type = "button";
    spacer.className = "tree-toggle is-leaf";
    spacer.textContent = "•";
    spacer.tabIndex = -1;
    const closeSpan = document.createElement("span");
    closeSpan.innerHTML = `<span class="tree-punct">${close}</span>`;
    closeLine.appendChild(spacer);
    closeLine.appendChild(closeSpan);
    children.appendChild(closeLine);

    node.appendChild(children);
  }

  return node;
}

function setTreeOutput(value, textForCopy) {
  outputEl.replaceChildren();
  outputEl.appendChild(createTreeNode(undefined, value, true));
  copyText = textForCopy;
  btnCopy.disabled = !copyText;
  setTreeActionsEnabled(true);
}

function setAllCollapsed(collapsed) {
  const nodes = outputEl.querySelectorAll(".tree-node");
  nodes.forEach((node) => {
    const toggle = node.querySelector(":scope > .tree-line > .tree-toggle");
    if (!toggle || toggle.classList.contains("is-leaf")) return;
    node.classList.toggle("is-collapsed", collapsed);
    toggle.textContent = collapsed ? "▶" : "▼";
  });
}

/**
 * 将常见转义序列还原为真实字符（不依赖 JSON.parse）
 */
function unescapeString(str) {
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\v/g, "\v")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\//g, "/")
    .replace(/\\\\/g, "\\");
}

function normalizeInput(raw) {
  let text = raw.trim();
  if (!text) return "";

  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  text = text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  return text;
}

function tryUnwrapQuotedJson(text) {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    try {
      const unwrapped = JSON.parse(text);
      if (typeof unwrapped === "string") {
        return unwrapped;
      }
    } catch {
      // 不是合法 JSON 字符串字面量，继续人工剥壳
    }

    const quote = text[0];
    let inner = text.slice(1, -1);
    if (quote === "'") {
      inner = inner.replace(/\\'/g, "'");
    }
    return inner;
  }
  return text;
}

/**
 * 判断字符串是否像一段 JSON 对象/数组（含被再次编码的情况）
 */
function looksLikeJsonContainer(str) {
  if (typeof str !== "string") return false;
  const t = str.trim();
  if (!t) return false;
  return (
    (t.startsWith("{") && t.endsWith("}")) ||
    (t.startsWith("[") && t.endsWith("]"))
  );
}

/**
 * 尝试把「JSON 字符串字段」解析成对象/数组；失败则原样返回
 */
function tryParseJsonString(str, maxDepth = 6) {
  let current = str;
  for (let i = 0; i < maxDepth; i++) {
    if (typeof current !== "string") return current;
    const trimmed = current.trim();
    if (!looksLikeJsonContainer(trimmed) && !(trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return current;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed !== current) {
        current = parsed;
        continue;
      }
      return current;
    } catch {
      const unescaped = unescapeString(trimmed);
      if (unescaped !== trimmed) {
        current = unescaped;
        continue;
      }
      return str;
    }
  }
  return current;
}

/**
 * 递归展开对象/数组里所有「被转义成字符串」的 JSON 字段
 * 例如 question_audio / options 这类 "{\"url\":...}"
 */
function deepDecodeNested(value, stats = { decoded: 0 }, depth = 0) {
  if (depth > 20) return value;

  if (typeof value === "string") {
    if (!looksLikeJsonContainer(value) && !(value.trim().startsWith('"') && value.trim().endsWith('"'))) {
      return value;
    }
    const parsed = tryParseJsonString(value);
    if (parsed !== value) {
      stats.decoded += 1;
      return deepDecodeNested(parsed, stats, depth + 1);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepDecodeNested(item, stats, depth + 1));
  }

  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = deepDecodeNested(value[key], stats, depth + 1);
    }
    return out;
  }

  return value;
}

function deepParseJson(raw, maxDepth = 8) {
  let text = normalizeInput(raw);
  if (!text) {
    throw new Error("请输入 JSON 内容");
  }

  let lastError = null;
  let layers = 0;
  let value = null;
  let current = text;

  for (let i = 0; i < maxDepth; i++) {
    current = current.trim();

    if (
      (current.startsWith('"') && current.includes('\\"')) ||
      (current.startsWith("'") && current.includes("\\'")) ||
      (current.startsWith('"') && current.endsWith('"') && current.includes("\\n"))
    ) {
      const unwrapped = tryUnwrapQuotedJson(current);
      if (unwrapped !== current) {
        current = unwrapped;
        layers += 1;
        continue;
      }
    }

    try {
      value = JSON.parse(current);
      layers += 1;

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (
          looksLikeJsonContainer(trimmed) ||
          (trimmed.startsWith('"') && trimmed.endsWith('"'))
        ) {
          current = value;
          continue;
        }
      }

      // 递归解开嵌套字段里的转义 JSON 字符串
      const stats = { decoded: 0 };
      value = deepDecodeNested(value, stats);
      layers += stats.decoded;

      return { value, layers, source: current, nestedDecoded: stats.decoded };
    } catch (err) {
      lastError = err;

      const unescaped = unescapeString(current);
      if (unescaped !== current) {
        current = unescaped;
        layers += 1;
        continue;
      }

      const unwrapped = tryUnwrapQuotedJson(current);
      if (unwrapped !== current) {
        current = unwrapped;
        layers += 1;
        continue;
      }

      break;
    }
  }

  if (value !== null && typeof value !== "string") {
    const stats = { decoded: 0 };
    value = deepDecodeNested(value, stats);
    return { value, layers: layers + stats.decoded, source: current, nestedDecoded: stats.decoded };
  }

  throw lastError || new Error("无法解析为有效 JSON");
}

function formatJson(value, space = 2) {
  return JSON.stringify(value, null, space);
}

function compressJson(value) {
  return JSON.stringify(value);
}

/** 最近一次成功解析出的值，供压缩使用 */
let lastParsedValue = null;

function showJsonResult(value, mode) {
  lastParsedValue = value;
  if (mode === "compress") {
    setPlainOutput(compressJson(value));
    return;
  }
  // 自动美化：树形展示，默认全部展开
  setTreeOutput(value, formatJson(value));
}

/**
 * 自动解析：反转义 + 美化（无需点按钮）
 */
function parseAndShow(mode = "parse") {
  const raw = inputEl.value;
  setStatus("", null);

  if (!normalizeInput(raw)) {
    clearOutput();
    lastParsedValue = null;
    return;
  }

  try {
    const { value } = deepParseJson(raw);
    setStatus("解析成功", "ok");
    showJsonResult(value, mode);
  } catch (err) {
    // deepParse 失败时，再尝试纯反转义路径
    try {
      let result = normalizeInput(raw);
      let rounds = 0;
      while (rounds < 8) {
        const next = unescapeString(tryUnwrapQuotedJson(result.trim()));
        if (next === result) break;
        result = next;
        rounds += 1;
      }
      let parsed = JSON.parse(result);
      const stats = { decoded: 0 };
      parsed = deepDecodeNested(parsed, stats);
      setStatus("解析成功", "ok");
      showJsonResult(parsed, mode);
    } catch {
      const msg = err && err.message ? err.message : String(err);
      setStatus(`解析失败：${msg}`, "err");
      clearOutput();
      lastParsedValue = null;
    }
  }
}

let parseTimer = null;
function scheduleAutoParse() {
  clearTimeout(parseTimer);
  parseTimer = setTimeout(() => parseAndShow("parse"), 200);
}

$("btnCompress").addEventListener("click", () => {
  if (lastParsedValue !== null) {
    setStatus("已压缩", "ok");
    showJsonResult(lastParsedValue, "compress");
    return;
  }
  parseAndShow("compress");
});

$("btnClear").addEventListener("click", () => {
  inputEl.value = "";
  clearOutput();
  lastParsedValue = null;
  setStatus("", null);
  inputEl.focus();
});

btnExpand.addEventListener("click", () => setAllCollapsed(false));
btnCollapse.addEventListener("click", () => setAllCollapsed(true));

btnCopy.addEventListener("click", async () => {
  if (!copyText) return;
  try {
    await navigator.clipboard.writeText(copyText);
    setStatus("已复制到剪贴板", "ok");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = copyText;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setStatus("已复制到剪贴板", "ok");
  }
});

// 输入 / 粘贴后自动解析（反转义 + 美化）
inputEl.addEventListener("input", scheduleAutoParse);
inputEl.addEventListener("paste", () => {
  // paste 后 value 尚未更新，等下一帧再解析
  setTimeout(() => parseAndShow("parse"), 0);
});

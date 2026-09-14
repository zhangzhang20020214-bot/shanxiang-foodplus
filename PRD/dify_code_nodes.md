# Dify 加固 · 前置拦截 + 后置校验 代码节点（可粘贴版）

> 适用于 Chatflow / Workflow 画布。Python3 语言。
> 目标拓扑见正文。变量引用语法：上游节点输出用 `{{#节点名.变量名#}}` 引用（多数地方用变量选择器点选即可）。

---

## 节点 1 · 前置硬规则拦截

**位置**：开始节点之后、知识库之前。

**节点配置：**
- 语言：`Python3`
- 输入变量（点「+ 添加变量」）：
  - `query`，类型 `String`，引用 = 开始节点的用户输入（Chatflow 为 `sys.query`）
- 输出变量（按返回值自动生成或手动加）：
  - `blocked`（Boolean）、`blocked_json`（String）、`blocked_items`（Array[String]）

**代码：**

```python
import json

def main(query: str) -> dict:
    blocked = False
    blocked_items = []
    profile = {}
    text = ""

    # 1) 解析请求（前端以 JSON 字符串传入 {profile, mode, input}）
    try:
        req = json.loads(query)
        profile = req.get("profile", {})
        inp = req.get("input", {})
        text = (inp.get("text") or "") if isinstance(inp, dict) else ""
    except Exception:
        # 非 JSON（纯文本）时，退化为对整段文字做关键词检查
        text = query or ""

    # 2) 高危限制项：过敏/禁忌/用药 且 severity=high
    for r in profile.get("healthRestrictions", []):
        if r.get("severity") == "high" and r.get("type") in ("allergy", "taboo", "drug"):
            item = (r.get("item") or "").strip()
            if item and item in text:
                blocked = True
                blocked_items.append(item)

    # 3) 生成拦截 JSON（供拦截分支直接回复）
    blocked_json = ""
    if blocked:
        message = "检测到高危食材/成分「" + "、".join(blocked_items) + "」，与档案健康限制冲突，已拦截。"
        blocked_json = json.dumps({
            "blocked": True,
            "risk": {"level": "high", "message": message, "items": blocked_items},
        }, ensure_ascii=False)

    return {
        "blocked": blocked,
        "blocked_json": blocked_json,
        "blocked_items": blocked_items,
    }
```

---

## 条件分支（IF/ELSE）· 拦截回复

1. 在「代码节点1」后加一个「**条件分支**（IF/ELSE）」节点。
2. 条件：变量 = 代码节点1 的 `blocked`，比较 = `是`（等于 true）。
3. **IF 分支（true）**：加「**直接回复**」节点，内容引用 `{{#代码节点1.blocked_json#}}`。
4. **ELSE 分支（false）**：接原有「知识库 → LLM」链路。

---

## 节点 2 · 后置 JSON 校验 + 兜底拦截

**位置**：LLM 之后、直接回复之前。

**节点配置：**
- 语言：`Python3`
- 输入变量：
  - `llm_text`，类型 `String`，引用 = LLM 节点的 `text`（输出）
  - `query`，类型 `String`，引用 = `sys.query`（用于再取一次 profile）
- 输出变量：
  - `valid`（Boolean）、`final_json`（String）

**代码：**

```python
import json
import re

DISCLAIMER = "本建议仅供参考，不构成医疗诊断或治疗意见。如有健康问题请咨询专业医生。"

def main(llm_text: str, query: str) -> dict:
    # 1) 再取一次 profile，用于确定性复核
    profile = {}
    try:
        req = json.loads(query)
        profile = req.get("profile", {})
    except Exception:
        profile = {}

    # 2) 解析 LLM 输出的 JSON（容错：去代码块围栏 / 提取花括号片段）
    data = None
    raw = (llm_text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw).strip()
    try:
        data = json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.S)
        if m:
            try:
                data = json.loads(m.group(0))
            except Exception:
                data = None

    if not isinstance(data, dict):
        return {
            "valid": False,
            "final_json": json.dumps({
                "blocked": False,
                "result": {
                    "title": "服务暂时不可用",
                    "advice": ["抱歉，本次生成结果解析失败，请重试。"],
                    "disclaimer": DISCLAIMER,
                },
            }, ensure_ascii=False),
        }

    # 3) 确定性复核：高危项是否出现在 LLM 声明的结果里（对图片模式兜底）
    blocked = bool(data.get("blocked", False))
    blocked_items = list((data.get("risk") or {}).get("items") or [])

    if not blocked:
        high_items = [
            (r.get("item") or "").strip()
            for r in profile.get("healthRestrictions", [])
            if r.get("severity") == "high" and r.get("type") in ("allergy", "taboo", "drug")
        ]
        result = data.get("result") or {}
        haystack = json.dumps(result, ensure_ascii=False)
        for item in high_items:
            if item and item in haystack:
                blocked = True
                blocked_items.append(item)

    # 4) 规整最终 JSON
    if blocked:
        final = {
            "blocked": True,
            "risk": {
                "level": "high",
                "message": "检测到高危食材/成分「" + "、".join(blocked_items) + "」，与档案健康限制冲突，已拦截。",
                "items": blocked_items,
            },
        }
    else:
        final = data
        final["blocked"] = False
        result = final.get("result") or {}
        result["disclaimer"] = DISCLAIMER
        final["result"] = result

    return {
        "valid": True,
        "final_json": json.dumps(final, ensure_ascii=False),
    }
```

---

## 最终接线步骤（按顺序点）

1. 在「开始」和「知识库」之间点 `+`，选「**代码执行**」，粘贴节点1代码，配好 `query` 输入变量（← `sys.query`）。
2. 在节点1后加「**条件分支**」：`blocked == true`。
3. IF 分支加「**直接回复**」，内容选 `{{#代码节点1.blocked_json#}}`。
4. ELSE 分支接回你原有的「知识库 → LLM」。
5. 在 LLM 后加「**代码执行**」，粘贴节点2代码，配 `llm_text`（← LLM 的 `text`）和 `query`（← `sys.query`）。
6. 最后加「**直接回复**」，内容选 `{{#代码节点2.final_json#}}`。

## 常见坑

- **代码节点参数报错**：Dify 要求 `main()` 的参数名与你「输入变量」里加的名字**完全一致**（`query` / `llm_text`）。若提示 `main(input_vars)` 形式，则改成 `def main(input_vars: dict)` 并用 `input_vars["query"]` 取值。
- **变量选不到**：先确保上游节点已保存，再回本节点的「引用」里点选。
- **JSON 直接显示成字符串**：直接回复节点若把 `final_json` 当纯文本输出没问题；若想要结构化，可在最后用「代码节点」做一次 `json.loads` 或 Dify 的结构化输出。

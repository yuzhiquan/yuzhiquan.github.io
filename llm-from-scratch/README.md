# 从零开始理解大模型 · 交互式教程

一个单页、可动手玩的交互式教程，覆盖「从零理解大模型（llm-from-scratch）」系列的 16 篇内容：
预测下一个 token、Token、Embedding、Attention、Transformer、训练、推理与 KV Cache、上下文窗口、
Scaling Law、Agent、多模态、GPU、Token 计费、思考模式、MoE、算子。

## 访问地址

- 线上：`https://yuzhiquan.github.io/llm-from-scratch/`
- 本目录即站点静态文件：`index.html` + `assets/`（纯前端，无需后端/构建）

## 内容来源与署名

- 原始教学文档与代码来自开源仓库
  [`GitHubxsy/nanoAgent`](https://github.com/GitHubxsy/nanoAgent)，分支
  `claude/organize-teaching-materials-4hnRP` 下的 `llm-from-scratch/`。
- 本教程是在原系列基础上**重新组织并增强为交互式版本**：左侧固定目录 + 学习进度、
  顶部进度条、16 个可交互演示（温度滑块、BPE 单步合并、Attention 六步推演、KV Cache 生成、
  Scaling Law 拟合、Agent 循环、GPU 延迟、Token 计费、思考模式权衡、MoE 路由、算子融合等）。
- 所有讲解结论、关键数字、类比均沿用原系列；交互演示为新增。

## 本地预览

直接用浏览器打开 `index.html` 即可（相对路径加载资源）。
如需通过本地服务器避免个别浏览器的 file:// 限制：

```bash
python -m http.server 8000
# 然后访问 http://127.0.0.1:8000/llm-from-scratch/
```

## 文件结构

```
llm-from-scratch/
├── index.html        # 教程主页面
├── assets/
│   ├── style.css     # 样式（浅/深色主题、布局）
│   ├── content.js    # 16 篇结构化讲解内容（含 96 道自测）
│   ├── demos.js      # 16 个交互演示逻辑
│   └── app.js        # 目录渲染、滚动高亮、进度本地保存、键盘导航
└── README.md         # 本说明
```

## 更新方式

直接覆盖 `index.html` 与 `assets/` 下对应文件后重新推送即可。

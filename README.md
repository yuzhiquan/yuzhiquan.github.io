# yuzhiquan.github.io

个人博客，基于 **Chirpy (Jekyll 主题)** 构建，通过 **GitHub Actions** 自动部署到 GitHub Pages。

## 迁移说明

本站原为 Hexo（hexo-theme-coder）生成的静态成品，源码已不可考。
现从旧站成品回收 24 篇文章 + `llm-from-scratch` 交互教程，重建为 Chirpy/Jekyll 工程。

- 文章：原 `/2020/12/14/xxx/` 等 URL 保持不变，`_posts/` 下为回收的 Markdown
- 头像：`/assets/img/llm_logo.png`（LLM 风格）
- 教程：`/llm-from-scratch/` 原样保留
- 评论：已预留 giscus 配置（见 `_config.yml` 注释），启用需开启 Discussions + giscus.app

## 本地预览

```bash
bundle install
bundle exec jekyll s
```

## 回滚

旧 Hexo 站完整备份在 `backup/hexo-legacy` 分支，需要回滚时将其内容推回 master 即可。

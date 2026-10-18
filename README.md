# Norio 富文本编辑器 Skill

`norio-rich-text` 是配合 [@norio-office/rich-text](https://www.npmjs.com/package/@norio-office/rich-text) 富文本编辑器使用的 AI Skill。它帮助 AI 按编辑器的原生文档结构创建内容，并对当前文档的选区、光标位置或指定节点进行局部修改，而不是直接拼接 HTML 或替换整篇文档。

![Norio 富文本编辑器界面及斜杠命令菜单](assets/editor-screenshot.png)

## 能做什么

- 指导 AI 使用编辑器提供的工具读取文档与选区、创建文档、提交局部修改。
- 提供文档与补丁格式、流式事件、`.nordox` 文件格式的参考说明、Schema 和示例。
- 附带可选的 Node.js 命令行工具，用于离线校验和创建文档包。

Skill 入口是 [`norio-rich-text/SKILL.md`](norio-rich-text/SKILL.md)，配套资料位于 `norio-rich-text/references/`、`schemas/` 和 `examples/`。接入步骤见[集成说明](norio-rich-text/references/integration.md)。

## 接入说明

在宿主应用中安装兼容的 `@norio-office/rich-text`，接入编辑器的 AI Bridge，并注册相应工具；再将本 Skill 提供给 AI 运行环境。**只拉取 Skill 不会自动安装编辑器、注册工具或获得文档权限**。可选命令行工具需要 Node.js 20+，以及提供 `ai-protocol`、`nordox` 入口的兼容编辑器版本。

## 维护与发布

在主仓库构建编辑器后运行 `npm run skill:verify`。修改 Skill 后，先将 `packages/skills` 的改动提交并推送至 CNB `main`，再从仓库根目录执行 `npm run push -- --skills`，只把该目录同步到 GitHub Skill 仓库。普通的 `git pull`、`git push` 仍操作 CNB 仓库。

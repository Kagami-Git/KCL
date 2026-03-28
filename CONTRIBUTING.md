# 贡献指南

感谢您对 KagamiCraft Launcher 的关注！

## 提交信息格式

我们使用 **Conventional Commits** 格式来自动生成更新日志。

### 格式

```
<类型>(<范围>): <描述>

[可选的正文]
```

### 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更改 |
| `style` | 代码格式更改（不影响代码含义的更改） |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 添加或修改测试 |
| `chore` | 构建过程或辅助工具的更改 |

### 示例

```bash
git commit -m "feat: 添加游戏下载页面"
git commit -m "fix(settings): 修复设置保存问题"
git commit -m "docs: 更新 README"
git commit -m "refactor(sidebar): 优化导航布局"
```

### 范围（可选）

使用受影响的模块/功能作为范围：

- `sidebar` - 侧边栏
- `home` - 首页
- `game` - 游戏管理
- `download` - 下载页面
- `settings` - 设置页面
- `settings(java)` - Java 设置
- `settings(ui)` - 界面设置

### 破坏性更改

在 `:` 前添加 `!` 或在正文末尾包含 `BREAKING CHANGE:`：

```bash
git commit -m "feat!: 更改 API 响应格式"
```

## Pull Request 指南

1. 请遵循上述提交格式
2. 适时关联 Issue
3. 确保代码通过检查

## 问题？

如有疑问，欢迎提交 Issue。

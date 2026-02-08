<p align="left">
  <img src="https://github.com/Neo-Life/.github/blob/main/img/nebula-sm.jpg?raw=true" alt="Nebula" width="100%">
</p>

# Nebula (Based on [AstrBot](https://github.com/AstrBotDevs/AstrBot))

## ⚖️ Fork Disclaimer & License Agreement
> [!Note]
> This repository is a personal modified fork based on the upstream project.

### 1. Scope & Purpose Limitation
All modifications, configuration adjustments, and derivative code within this repository created by **IGCrystal** are intended solely for the developer's personal learning, research, and data backup purposes.

This modified version is **not intended** to provide public services, stable interfaces, or production environment solutions to any third party. Any acquisition, deployment, or execution of the content of this repository by parties other than the developer is deemed a voluntary personal action and is unrelated to the modifier (**IGCrystal**) or the original upstream author.

### 2. No Warranty
The modifications contained in this repository are provided **"AS IS"**, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, or non-infringement.

The modifier (**IGCrystal**) makes no commitment to provide continuous maintenance, follow upstream updates, or offer technical support for this fork. You are solely responsible for all risks associated with running this modified version (including, but not limited to, data loss, system failure, or legal risks).

### 3. License
As a derivative work of the upstream project, this repository strictly adheres to the **GNU Affero General Public License v3.0 (AGPL-3.0)** adopted by the original project.

* **Inheritance:** All copyright notices and license files from the upstream project are retained within this repository.
* **Distribution Obligation:** Under the AGPL, if you run this modified version over a network and interact with others, you must disclose your complete source code (including **IGCrystal**'s modifications) to the users interacting with it.

**If you cannot accept the terms of the AGPL or the limitations of this statement, please stop using this repository immediately.**

---

## ⚖️ 派生版本免责声明与许可协议
> [!NOTE]
> **注意**：本仓库是基于上游项目进行的个人修改版本 (Fork)。

### 1. 范围与用途限定 (Scope & Purpose Limitation)
本仓库（Repository）内由 **IGCrystal** 进行的所有修改内容、配置调整及衍生代码，仅供开发者本人进行个人学习、研究及数据备份使用。

本修改版本**不旨在**向任何第三方提供公共服务、稳定接口或生产环境解决方案。任何非本人对本仓库内容的获取、部署或运行行为，均被视为您的个人自发行为，与修改者 (**IGCrystal**) 及原上游作者无关。

### 2. 无担保声明 (No Warranty)
本仓库包含的修改内容按 **“原样”** 提供，不附带任何明示或暗示的保证，包括但不限于对适销性、特定用途适用性或非侵权性的保证。

修改者 (**IGCrystal**) 不承诺对本派生版本进行任何形式的持续维护、跟随上游更新或技术支持。您需自行承担运行本修改版本可能带来的所有风险（包括数据丢失、系统故障或法律风险）。

### 3. 许可协议 (License)
本仓库作为上游项目的派生作品，严格遵循原项目采用的 **GNU Affero General Public License v3.0 (AGPL-3.0)** 开源协议。

* **继承性**：本仓库内保留了上游项目的所有版权声明及许可文件。
* **分发义务**：根据 AGPL 协议，如果您在网络环境运行本修改版本并与他人交互，您必须向交互者公开您的完整源代码（包含 **IGCrystal** 的修改部分）。

**如果您无法接受 AGPL 协议的条款或本声明的限制，请立即停止使用本仓库。**

推荐使用 Docker / Docker Compose 方式部署 AstrBot。

请参阅官方文档 [使用 Docker 部署 AstrBot](https://astrbot.app/deploy/astrbot/docker.html#%E4%BD%BF%E7%94%A8-docker-%E9%83%A8%E7%BD%B2-astrbot) 。

#### uv 部署

```bash
uvx astrbot
```

#### 宝塔面板部署

AstrBot 与宝塔面板合作，已上架至宝塔面板。

请参阅官方文档 [宝塔面板部署](https://astrbot.app/deploy/astrbot/btpanel.html) 。

#### 1Panel 部署

AstrBot 已由 1Panel 官方上架至 1Panel 面板。

请参阅官方文档 [1Panel 部署](https://astrbot.app/deploy/astrbot/1panel.html) 。

#### 在 雨云 上部署

AstrBot 已由雨云官方上架至云应用平台，可一键部署。

[![Deploy on RainYun](https://rainyun-apps.cn-nb1.rains3.com/materials/deploy-on-rainyun-en.svg)](https://app.rainyun.com/apps/rca/store/5994?ref=NjU1ODg0)

#### 在 Replit 上部署

社区贡献的部署方式。

[![Run on Repl.it](https://repl.it/badge/github/AstrBotDevs/AstrBot)](https://repl.it/github/AstrBotDevs/AstrBot)

#### Windows 一键安装器部署

请参阅官方文档 [使用 Windows 一键安装器部署 AstrBot](https://astrbot.app/deploy/astrbot/windows.html) 。

#### CasaOS 部署

社区贡献的部署方式。

请参阅官方文档 [CasaOS 部署](https://astrbot.app/deploy/astrbot/casaos.html) 。

#### 手动部署

首先安装 uv：

```bash
pip install uv
```

通过 Git Clone 安装 AstrBot：

```bash
git clone https://github.com/AstrBotDevs/AstrBot && cd AstrBot
uv run main.py
```

或者请参阅官方文档 [通过源码部署 AstrBot](https://astrbot.app/deploy/astrbot/cli.html) 。

#### 桌面端 Electron 打包

桌面端（Electron 打包，`pnpm` 工作流）构建流程请参阅：[`desktop/README.md`](desktop/README.md)。

## 支持的消息平台

**官方维护**

- QQ (官方平台 & OneBot)
- Telegram
- 企微应用 & 企微智能机器人
- 微信客服 & 微信公众号
- 飞书
- 钉钉
- Slack
- Discord
- Satori
- Misskey
- Whatsapp (将支持)
- LINE (将支持)

**社区维护**

- [Matrix](https://github.com/stevessr/astrbot_plugin_matrix_adapter)
- [KOOK](https://github.com/wuyan1003/astrbot_plugin_kook_adapter)
- [VoceChat](https://github.com/HikariFroya/astrbot_plugin_vocechat)

## 支持的模型服务

**大模型服务**

- OpenAI 及兼容服务
- Anthropic
- Google Gemini
- Moonshot AI
- 智谱 AI
- DeepSeek
- Ollama (本地部署)
- LM Studio (本地部署)
- [优云智算](https://www.compshare.cn/?ytag=GPU_YY-gh_astrbot&referral_code=FV7DcGowN4hB5UuXKgpE74)
- [302.AI](https://share.302.ai/rr1M3l)
- [小马算力](https://www.tokenpony.cn/3YPyf)
- [硅基流动](https://docs.siliconflow.cn/cn/usercases/use-siliconcloud-in-astrbot)
- [PPIO 派欧云](https://ppio.com/user/register?invited_by=AIOONE)
- ModelScope
- OneAPI

**LLMOps 平台**

- Dify
- 阿里云百炼应用
- Coze

**语音转文本服务**

- OpenAI Whisper
- SenseVoice

**文本转语音服务**

- OpenAI TTS
- Gemini TTS
- GPT-Sovits-Inference
- GPT-Sovits
- FishAudio
- Edge TTS
- 阿里云百炼 TTS
- Azure TTS
- Minimax TTS
- 火山引擎 TTS

## ❤️ 贡献

欢迎任何 Issues/Pull Requests！只需要将你的更改提交到此项目 ：)

### 如何贡献

你可以通过查看问题或帮助审核 PR（拉取请求）来贡献。任何问题或 PR 都欢迎参与，以促进社区贡献。当然，这些只是建议，你可以以任何方式进行贡献。对于新功能的添加，请先通过 Issue 讨论。

### 开发环境

AstrBot 使用 `ruff` 进行代码格式化和检查。

```bash
git clone https://github.com/AstrBotDevs/AstrBot
pip install pre-commit
pre-commit install
```

## 🌍 社区

### QQ 群组

- 1 群：322154837
- 3 群：630166526
- 5 群：822130018
- 6 群：753075035
- 7 群：743746109
- 8 群：1030353265
- 开发者群：975206796

### Telegram 群组

<a href="https://t.me/+hAsD2Ebl5as3NmY1"><img alt="Telegram_community" src="https://img.shields.io/badge/Telegram-AstrBot-purple?style=for-the-badge&color=76bad9"></a>

### Discord 群组

<a href="https://discord.gg/hAVk6tgV36"><img alt="Discord_community" src="https://img.shields.io/badge/Discord-AstrBot-purple?style=for-the-badge&color=76bad9"></a>

## ❤️ Special Thanks

特别感谢所有 Contributors 和插件开发者对 AstrBot 的贡献 ❤️

<a href="https://github.com/AstrBotDevs/AstrBot/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AstrBotDevs/AstrBot" />
</a>

此外，本项目的诞生离不开以下开源项目的帮助：

- [NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ) - 伟大的猫猫框架

## ⭐ Star History

> [!TIP]
> 如果本项目对您的生活 / 工作产生了帮助，或者您关注本项目的未来发展，请给项目 Star，这是我们维护这个开源项目的动力 <3

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=astrbotdevs/astrbot&type=Date)](https://star-history.com/#astrbotdevs/astrbot&Date)

</div>

</details>

<div align="center">

_陪伴与能力从来不应该是对立面。我们希望创造的是一个既能理解情绪、给予陪伴，也能可靠完成工作的机器人。_

_私は、高性能ですから!_

<img src="https://files.astrbot.app/watashiwa-koseino-desukara.gif" width="100"/>

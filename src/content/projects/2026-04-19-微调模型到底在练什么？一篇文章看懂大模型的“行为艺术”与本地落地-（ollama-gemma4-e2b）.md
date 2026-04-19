---
title: 微调模型到底在练什么？一篇文章看懂大模型的“行为艺术”与本地落地 （Ollama+Gemma4 E2B）
description: 模型微调不只是学习知识，更是学习“行为习惯”。通过揭示 LoRA 适配器与 GGUF 文件的本质区别，看清模型权重的演变。让模型真正适配你的专业工作流。
date: 2026-04-19T03:10:00
image: /images/Screenshot 2026-04-15 at 17.26.27.png
tags: []
---

## 微调的底层逻辑 | The Core Logic of Fine-Tuning

理解微调，关键在于理解"预训练模型学到了什么，我要在此基础上改变什么"。

### 预训练模型是一个"通才" 

一个基础大模型（如 Gemma E2B）在海量互联网数据上预训练后，已经学会了语言的底层规律、世界知识和推理能力。但它不知道具体任务格式、领域术语或行为风格。

### 微调的学习目标 | What Fine-Tuning Actually Teaches

微调本质上是\*\*在预训练知识上叠加"行为习惯"\*\*，主要作用包括：

1. **指令遵循（Instruction Following）**：学会按固定格式回答，比如 JSON 输出、代码生成
2. **领域适配（Domain Adaptation）**：学习特定领域的术语与逻辑，如医疗、法律、客服
3. **风格对齐（Style Alignment）**：调整回答的语气、长度、语言偏好
4. **任务特化（Task Specialization）**：在分类、摘要、翻译等特定任务上提升准确率

## 新手如何初步微调模型

【原计划：Colab 一条龙】

训练 → 保存 LoRA → 直接在 Colab 转 GGUF → 下载到 Mac

Gemma E2B 基础模型有 **51 亿个参数**，如果全量微调需要保存完整权重，文件约 **9.5 GB**。
LoRA 的做法是：把这 51 亿个旋钮**全部锁死**，只在旁边插入一个只有约 **1268 万个参数（0.25%）** 的小适配器，只训练和保存这个小适配器。
![](/images/Screenshot%202026-04-15%20at%2000.28.42.png)

针对 Gemma 4 不同模型，有不同的微调数据集
![](/images/Screenshot%202026-04-15%20at%2000.30.16.png)

![](/images/Screenshot%202026-04-15%20at%2000.57.18.png)

### 为什么会有三十多格？| Why 30+ Cells?

Notebook 的格子不等于步骤数量。很多格只是**展示效果**的演示格，并非微调必需。整个 Notebook 实际可以分成五个阶段：

【第1阶段】安装依赖        → 2–3格 
【第2阶段】模型演示        → 10格左右（展示文字/图片/音频能力，纯演示可跳过） 
【第3阶段】微调核心        → 6–8格（加 LoRA → 准备数据 → 训练 → 查看结果）
【第4阶段】推理测试        → 2–3格（测试微调后的模型效果） 
【第5阶段】保存/导出       → 5–6格（保存 LoRA、转 GGUF、上传 HF 等选项）
真正"微调"只需要中间那 6–8 格，其他都是教学演示。

完整模型：51亿参数 → 约 9.5 GB
LoRA适配器：1268万参数 → 约 48 MB（adapter_model.safetensors）

## 两种格式的本质区别 | The Core Difference 

--> **gemma_4_lora/** and **gemma_4_finetune.gguf**

用一个比喻来理解：

|  | LoRA 适配器<br>（gemma_4_lora/） | GGUF 文件<br>（gemma_4_finetune.gguf） |
| --- | --- | --- |
| 类比 | 你的**训练笔记**（只有改动部分） | 完整的**合订教材**（基础知识 + 改动） |
| 大小 | \~80 MB（很小） | \~2–3 GB（很大） |
| 用途 | 继续训练、修改、发布给别人复现 | 直接给 Ollama/llama.cpp 运行 |
| 能否单独使用 | ❌ 必须配合原始基础模型才能运行 | ✅ 独立文件，直接运行 |

***

**对目前的目标“本地用 Ollama 运行”来说，只需要 GGUF，不需要 gemma_4_lora/。**

但保存 gemma_4_lora/ 有以下几个实际价值：

1. **万一以后想继续微调** — 可以在上次的基础上接着训练，不用从头来
2. **文件极小只有 80MB** — 保存在 Drive 几乎没有成本
3. **GGUF 转换可以重新做** — LoRA 适配器可以重新转成不同量化精度的 GGUF（Q4、Q8、BF16 等），很灵活
4. **GGUF 一旦 Colab 关闭就消失** — 如果你忘了下载 GGUF，还能用 LoRA 重新生成

-------

【备用方案：借道 HuggingFace】
训练 → 保存 LoRA → 合并为 16bit 模型
                              ↓
                    上传到 HuggingFace（需要 Token 登录）
                              ↓
                    用 HF 的服务器转 GGUF（内存够用）
                              ↓
                    从 HF 下载 GGUF 到 Mac

## 解决步骤 | Fix Steps

## 第一步：获取 HuggingFace Token

1. 打开： \*\*[https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)\*\*
2. 点击 \*\*"New token"\*\*（新建令牌）
3. 名字随便填（如 `colab`），权限选 \*\*"Write"\*\*（写入权限，上传模型需要）
4. 点击 \*\*"Generate a token"\*\*
5. 复制生成的 Token（格式类似 `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

```plain
from huggingface_hub import login
login(token="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")  # ← 替换这里

from huggingface_hub import HfApi
api = HfApi()
api.create_repo("你的用户名/gemma4-e2b-finetuned", private=True)  # ← 替换用户名
api.upload_folder(
    folder_path="/content/gemma_4_finetune",
    repo_id="你的用户名/gemma4-e2b-finetuned",  # ← 替换用户名
    repo_type="model"
)
```

如何在自己 HuggingFace里面找到微调好的模型

1. 进入Hugging Face的主页：https://huggingface.co/
2. 右上角点击用户头像 --> 点击profile下的个人用户名
3. 进入以后就可以看到已经从colab微调好的模型

![](/images/Screenshot%202026-04-14%20at%2023.54.58.png)

由于我微调好模型是BF16 Safetensors，我们必须要GGUF 量化格式，以满足Macbook Air M1 Chip 8GB内存的配置下流程运行

## 必须转 GGUF，而且要选 Q4_K_M

| 量化格式<br> | 文件大小 | M1 8GB 能跑 | 质量 |
| --- | --- | --- | --- |
| BF15 | 10.3GB | ❌ 不行 | 最高 |
| Q8_0 | \~9 GB | ❌ 不行 | 很高 |
| Q4_K_M | \~4.5 GB | ✅ 可以 | 好（推荐） |
| Q4_0 | \~4 GB | ✅ 可以 | 一般 |

## 如何转 GGUF

进入Hugging Face的主页：https://huggingface.co/

![](/images/Screenshot%202026-04-14%20at%2023.28.48.png)

点击上面的“**Space**”

![](/images/Screenshot%202026-04-14%20at%2023.31.02.png)

在 “**Ask anything you want to do with AI**” 里 搜索\*\*[gguf-my-repo](https://huggingface.co/spaces/ggml-org/gguf-my-repo)\*\* 

![](/images/Screenshot%202026-04-14%20at%2023.31.55.png)

选择第一个“**Running on A10G**” -- 1.92K的

![](/images/Screenshot%202026-04-14%20at%2023.35.12.png)

进入以后，点击“**Sign in with Hugging Face**”，登录你的Hugging Face账号。

接下来你会看到几个输入框，按以下填写：

| 字段 | 填写内容 |
| --- | --- |
| **Hub Model ID** | Robin9812/gemma4-e2b-finetuned<br>（你的自己已经微调好的模型名称，这里拿我的模型名称举例） |
| **Quantization Method** | 点下拉菜单 → 选 \*\*`Q4_K_M`\*\* |
| **Private Repo** | 可以勾选（生成的 GGUF 仓库设为私有） |
| **Use Imatrix / Split Model** | 不用勾 |

点橙色 `Submit` 按钮，等待 10–20 分钟

转换完成后右侧区域会显示结果链接
![](/images/Screenshot%202026-04-15%20at%2000.09.18.png)

点进去 / 去自己账户里找到新生成的 GGUF 仓库→ **Files and versions** 标签页 
![](/images/Screenshot%202026-04-15%20at%2000.09.44.png)

找到 `.gguf` 文件 → 点右边下载按钮 → 保存到 Mac `~/Downloads/`
![](/images/Screenshot%202026-04-15%20at%2000.07.59.png)

当然，以上操作都不想做的同学，可以直接在Hugging Face上搜索我已经公开的 **Gemma4 E2B-Q4_K_M** 量化模型，然后根据 “**Robin9812/gemma4-e2b-finetuned-Q4_K_M-GGUF**"来搜索下载即可。

下载好了以后，现在需要用 **Ollama** 部署它。以下是完整步骤：

## 第一步：确认文件位置

打开 Mac **终端（Terminal）**，确认文件在哪里：
`ls ~/Downloads/*.gguf`

应该看到类似：
`/Users/你的用户名/Downloads/gemma4-e2b-finetuned-Q4_K_M.gguf`

## 第二步：创建 Modelfile

在终端里运行（**一整段复制粘贴**）：

`cat > ~/Downloads/Modelfile << 'EOF' FROM ./gemma4-e2b-finetuned-Q4_K_M.gguf SYSTEM """你是一个专业的多语言翻译助手，擅长中文、英文、德文的互译。请严格按照用户指令翻译，只输出译文，不添加解释或备注。""" PARAMETER temperature 0.3 PARAMETER top_p 0.9 PARAMETER stop "<end_of_turn>" PARAMETER stop "<eos>" EOF`

> ⚠️ `temperature 0.3` 比默认值更低，适合翻译场景（输出更稳定、更准确）
>    当然，这一段prompt“你是一个专业的多语言翻译助手，擅长中文、英文、德文的互译。请严格按照用户指令翻译，只输出译文，不添加解释或备注。” 你可以根据自己的需求进行更改，这里仅仅是举个例子

## 第三步：导入到 Ollama

**终端（Terminal）** 输入这段CLI：
`cd ~/Downloads ollama create my-gemma4-finetuned -f Modelfile`

等待约 **30–60 秒**，看到 `success` 即完成。

## 第四步：验证部署成功

查看已安装模型列表
 `ollama list`

应该看到 `my-gemma4-finetuned` 出现在列表中。

## 第五步：测试运行

`ollama run my-gemma4-finetuned`

出现 `>>>` 后直接输入测试：

`请将以下英文翻译成中文：The fine-tuning process has been completed successfully.`

出现翻译后，即代表设置已经完成部署。

## 最后

进入ollama选择已部署的模型即可
![](/images/Screenshot%202026-04-15%20at%2017.27.21.png)

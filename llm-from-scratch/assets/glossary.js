/* 术语词典：term 中文名 / en 英文名 / def 一句解释 / ch 所属章(ch01~ch16) */
window.GLOSSARY = [
  /* ch01 猜下一个词 */
  {term:'Next-Token Prediction', en:'next-token prediction', def:'LLM 的核心动作：给定前文预测下一个 token 的概率分布。', ch:'ch01'},
  {term:'Logits', en:'logits', def:'模型对词表中每个候选词的原始打分（未归一化）。', ch:'ch01'},
  {term:'Softmax', en:'softmax', def:'把任意实数打分变成和为 1 的正概率分布。', ch:'ch01'},
  {term:'Temperature', en:'temperature', def:'采样随机性超参，T 小更确定、T 大更多样。', ch:'ch01'},
  {term:'Greedy Decoding', en:'greedy decoding', def:'贪婪解码，每步选概率最大 token、确定但易僵化。', ch:'ch01'},
  {term:'Top-k Sampling', en:'top-k sampling', def:'选 k 采样，只在概率最高的 k 个候选里按权重采样。', ch:'ch01'},
  {term:'Top-p (Nucleus)', en:'top-p / nucleus', def:'核采样，在累计概率达 p 的最小候选集内采样。', ch:'ch01'},

  /* ch02 Token 与分词 */
  {term:'Token', en:'token', def:'模型词表里的整数编号，是模型处理文本的最小单位。', ch:'ch02'},
  {term:'Tokenization', en:'tokenization', def:'把文本切成模型认识的 token 的分词过程。', ch:'ch02'},
  {term:'BPE', en:'byte-pair encoding', def:'字节对编码，从字符起反复合并最高频相邻对的算法。', ch:'ch02'},
  {term:'Vocabulary', en:'vocabulary', def:'模型词表，所有 token 的集合（如 GPT-2 为 50257）。', ch:'ch02'},

  /* ch03 Embedding */
  {term:'Embedding', en:'embedding', def:'把每个 token 映射成 d 维向量以编码其语义。', ch:'ch03'},
  {term:'Cosine Similarity', en:'cosine similarity', def:'余弦相似度，用两向量夹角衡量语义接近度（不看长度）。', ch:'ch03'},
  {term:'Vector Space', en:'vector space', def:'向量空间，语义关系被编码为空间中的方向。', ch:'ch03'},
  {term:'Word Analogy', en:'word analogy', def:'词类比，向量加减可近似“推理”语义（king-man+woman≈queen）。', ch:'ch03'},

  /* ch04 Attention */
  {term:'Attention', en:'attention', def:'让每个 token 加权融合前文相关信息的核心机制。', ch:'ch04'},
  {term:'Query/Key/Value', en:'query key value', def:'QKV，注意力中“想找/是/给”的三种投影向量。', ch:'ch04'},
  {term:'Scaled Dot-Product Attention', en:'scaled dot-product attention', def:'缩放点积注意力：Q·Kᵀ/√d_k 后 softmax 乘 V。', ch:'ch04'},
  {term:'Causal Mask', en:'causal mask', def:'因果掩码，把未来位置分数置 −∞ 以保证只看前文。', ch:'ch04'},
  {term:'Scaling Factor', en:'scaling factor', def:'缩放因子 √d_k，防点积过大导致 softmax 梯度消失。', ch:'ch04'},

  /* ch05 Transformer */
  {term:'Transformer', en:'transformer', def:'多层“注意力+前馈+残差/归一”堆叠的模型架构。', ch:'ch05'},
  {term:'Multi-Head Attention', en:'multi-head attention', def:'多头注意力，多组 QKV 并行捕捉不同语义关系。', ch:'ch05'},
  {term:'Feed-Forward Network', en:'feed-forward network', def:'前馈网络 FFN，逐位置非线性变换，占模型多数参数。', ch:'ch05'},
  {term:'Residual', en:'residual', def:'残差连接，让梯度与信息可跨层直传、稳定训练。', ch:'ch05'},
  {term:'LayerNorm', en:'layer normalization', def:'层归一化，稳定每层输入分布的归一操作。', ch:'ch05'},
  {term:'Positional Encoding', en:'positional encoding', def:'位置编码，给 token 注入顺序信息（如 RoPE）。', ch:'ch05'},

  /* ch06 训练 */
  {term:'Training', en:'training', def:'训练，用梯度下降调整参数使“下一个词”预测更准。', ch:'ch06'},
  {term:'Loss', en:'loss', def:'损失（交叉熵），衡量预测分布与真实词的差距。', ch:'ch06'},
  {term:'Backpropagation', en:'backpropagation', def:'反向传播，用链式法则求损失对每个参数的梯度。', ch:'ch06'},
  {term:'Pretraining', en:'pretraining', def:'预训练，在海量无标注文本上先“学语言”。', ch:'ch06'},
  {term:'SFT', en:'supervised fine-tuning', def:'监督微调，用示范数据教模型按指令“做事”。', ch:'ch06'},
  {term:'RLHF', en:'RLHF', def:'基于人类反馈的强化学习，让回答对齐人类偏好。', ch:'ch06'},

  /* ch07 推理与 KV Cache */
  {term:'Inference', en:'inference', def:'推理，用训练好的模型根据前文生成文本。', ch:'ch07'},
  {term:'Prefill', en:'prefill', def:'预填充，一次性前向整段输入并建好 KV 缓存。', ch:'ch07'},
  {term:'Decode', en:'decode', def:'解码，逐字生成，每步只为新 token 算一次前向。', ch:'ch07'},
  {term:'KV Cache', en:'KV cache', def:'KV 缓存，复用历史 K/V 避免重算的显存结构。', ch:'ch07'},

  /* ch08 上下文窗口 */
  {term:'Context Window', en:'context window', def:'上下文窗口，模型一次能同时处理的 token 数上限。', ch:'ch08'},
  {term:'RoPE', en:'rotary position embedding', def:'旋转位置编码，用旋转矩阵注入位置、支持长上下文。', ch:'ch08'},
  {term:'Quadratic Complexity', en:'quadratic complexity', def:'n² 复杂度，注意力分数个数随长度平方增长。', ch:'ch08'},
  {term:'Attention Score', en:'attention score', def:'注意力分数，每对位置一个关注度值，共 n² 个。', ch:'ch08'},

  /* ch09 Scaling Law */
  {term:'Scaling Law', en:'scaling law', def:'缩放定律，损失随规模近似按幂律下降的经验规律。', ch:'ch09'},
  {term:'Power Law', en:'power law', def:'幂律，L∝N^(-α)，规模翻 10 倍损失乘固定比例。', ch:'ch09'},
  {term:'Chinchilla', en:'chinchilla', def:'Chinchilla 配比，算力固定时最优数据量约 D≈20N。', ch:'ch09'},
  {term:'Emergent Ability', en:'emergent ability', def:'涌现能力，规模到一定程度后某些任务指标突然抬升。', ch:'ch09'},
  {term:'Over-training', en:'over-training', def:'过度训练，用远超 20 倍数据训小模型以省推理成本。', ch:'ch09'},

  /* ch10 Agent */
  {term:'Agent', en:'agent', def:'智能体，模型+“思考-行动-观察”循环自主完成任务。', ch:'ch10'},
  {term:'Tool Calling', en:'tool calling', def:'工具调用，模型输出 tool_calls 由环境执行并取回结果。', ch:'ch10'},
  {term:'Messages', en:'messages', def:'消息，Agent 循环中不断追加的对话与工具结果轨迹。', ch:'ch10'},
  {term:'Agent Loop', en:'agent loop', def:'智能体循环，模型反复决策-调用-观察直到给出答案。', ch:'ch10'},

  /* ch11 多模态 */
  {term:'Multimodal', en:'multimodal', def:'多模态，让模型同时理解文本、图像等不同模态。', ch:'ch11'},
  {term:'Patch', en:'patch', def:'图像块，把图切成小块作为图像 token 的基本单元。', ch:'ch11'},
  {term:'Patch Embedding', en:'patch embedding', def:'块嵌入，把 patch 展平投影成图像 token 向量。', ch:'ch11'},
  {term:'Image Token', en:'image token', def:'图像 token，patch 投影后的向量，与文字 token 拼接输入。', ch:'ch11'},

  /* ch12 GPU 与算力 */
  {term:'GPU', en:'GPU', def:'图形处理器，靠海量弱核心并行做矩阵乘的算力卡。', ch:'ch12'},
  {term:'Memory Bandwidth', en:'memory bandwidth', def:'显存带宽，单位时间能从显存搬数据的字节数。', ch:'ch12'},
  {term:'FLOPS', en:'FLOPS', def:'每秒浮点运算次数，衡量硬件“算得多快”。', ch:'ch12'},
  {term:'Arithmetic Intensity', en:'arithmetic intensity', def:'算术强度，每搬 1 字节能做多少浮点运算。', ch:'ch12'},
  {term:'Quantization', en:'quantization', def:'量化，用更少比特表示权重以省显存与带宽。', ch:'ch12'},
  {term:'Memory Bound', en:'memory bound', def:'访存密集，瓶颈在带宽而非算力（如 decode）。', ch:'ch12'},

  /* ch13 Token 计费 */
  {term:'Token Pricing', en:'token pricing', def:'Token 计费，按 token 数计价，输出通常贵于输入。', ch:'ch13'},
  {term:'Prompt Cache', en:'prompt cache', def:'提示缓存，复用相同前缀 K/V 免重算、单价更低。', ch:'ch13'},
  {term:'Blended Price', en:'blended price', def:'混合单价，总费用除以总 token 数的派生均价。', ch:'ch13'},
  {term:'Decode Cost', en:'decode cost', def:'解码成本，输出走串行 decode、GPU 利用率低故更贵。', ch:'ch13'},

  /* ch14 思考模式 */
  {term:'Thinking Mode', en:'thinking mode', def:'思考模式，先生成思维链再答以提升难题准确率。', ch:'ch14'},
  {term:'Chain-of-Thought', en:'chain-of-thought', def:'思维链 CoT，模型逐步推理写出的中间过程 token。', ch:'ch14'},
  {term:'Test-time Compute', en:'test-time compute', def:'测试时计算，推理阶段投入更多算力换取能力。', ch:'ch14'},
  {term:'Reasoning Model', en:'reasoning model', def:'推理模型，内置思考模式、先 CoT 后答的模型。', ch:'ch14'},

  /* ch15 MoE */
  {term:'MoE', en:'mixture of experts', def:'混合专家，把 FFN 换成多专家、每 token 只激活少数。', ch:'ch15'},
  {term:'Expert', en:'expert', def:'专家，MoE 中被 Router 选中才参与计算的子网络。', ch:'ch15'},
  {term:'Router', en:'router', def:'路由器，给每个 token 给各专家打分并选 top-k。', ch:'ch15'},
  {term:'Top-k', en:'top-k', def:'选 k，Router 只取分数最高 k 个专家的稀疏激活策略。', ch:'ch15'},
  {term:'Sparse', en:'sparse', def:'稀疏，激活参数远小于总参数（如 64 专家选 2）。', ch:'ch15'},

  /* ch16 算子与加速 */
  {term:'Operator', en:'operator', def:'算子，模型计算图里的基础操作（如 MatMul、Softmax）。', ch:'ch16'},
  {term:'MatMul', en:'matrix multiplication', def:'矩阵乘法，模型参数计算的主体运算。', ch:'ch16'},
  {term:'Operator Fusion', en:'operator fusion', def:'算子融合，把多步合成一个以减少显存往返。', ch:'ch16'},
  {term:'FlashAttention', en:'flashattention', def:'闪存注意力，融合 S/P/O 计算、省显存往返的加速实现。', ch:'ch16'},
  {term:'GELU', en:'GELU', def:'高斯误差线性单元，Transformer 中常用的非线性激活函数。', ch:'ch16'}
];

/* 新增演示所需的准确数据，数字须源自精读笔记/materials，不要编造 */
window.DATA = {
  pricing: [
    {name:'DeepSeek V4 Pro', hit:1, input:12, output:24, unit:'元/百万token'},
    {name:'V4-Flash',        hit:0.2, input:1, output:2, unit:'元/百万token'}
  ],
  gpu: [
    {name:'H100 SXM', bw:3350},
    {name:'A100 80G', bw:2000},
    {name:'CPU DDR5', bw:80}
  ],
  models: [
    {name:'GPT-2',     params:124.4e6, layers:12, d:768,  heads:12, dk:64,  vocab:50257},
    {name:'≈7B',       params:7e9,     layers:32, d:4096, heads:32, dk:128, vocab:32000},
    {name:'≈70B',      params:70e9,    layers:80, d:8192, heads:64, dk:128, vocab:32000}
  ],
  scaling: {
    pts: [[10e6,3.40],[100e6,2.95],[1e9,2.56]],
    alpha: 0.0616,
    note:'三点拟合α≈0.0616；10B 外推 Loss≈2.22（源自精读笔记 09，原文口径：α 在 0.05–0.1）'
  },
  moe: {
    name:'DeepSeek 类 MoE', total:1.6e12, active:49e9, experts:64, topk:2,
    note:'总参数 1.6T / 激活 49B；每层 64 专家选 2。注：1.6T/49B/64选2 为教学取整，三者不能严格自洽（源自精读笔记 15，原文口径）'
  },
  decode: {
    note:'7B fp16≈14GB；A100 实测单步 5–10ms，CPU 200–500ms（含 kernel 开销，理论值偏快；源自精读笔记 12/13）'
  }
};

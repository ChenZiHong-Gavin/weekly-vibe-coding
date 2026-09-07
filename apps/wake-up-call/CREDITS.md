# 音频素材授权 / Audio credits

`assets/` 下的录音全部来自 Wikimedia Commons，均为可再分发授权。
每个文件都做了剪辑、归一化和首尾淡入淡出（为了循环播放不爆音），
并转成 AAC/m4a 单声道 56kbps（Safari 不能解 Ogg，所以没有直接用原始格式）。

标注为 CC BY-SA 的素材，其**剪辑后的版本同样以相同协议发布**。

## `assets/baby.m4a` —— 新生儿

- 原始文件：[Newborn baby crying sounds 20190831 061900.wav](https://commons.wikimedia.org/wiki/File:Newborn_baby_crying_sounds_20190831_061900.wav)
- 作者：Manoj Karingamadathil
- 授权：**CC BY-SA 4.0**
- 改动：截取第 2.95s 起的 6.0s，归一化，首尾 30ms 淡入淡出

## `assets/cat.m4a` —— 家猫

- 原始文件：[Meow of a Siamese cat - freemaster2.wav](https://commons.wikimedia.org/wiki/File:Meow_of_a_Siamese_cat_-_freemaster2.wav)
- 作者：freemaster2
- 授权：**CC0**
- 改动：整段 1.5s，归一化，首尾 30ms 淡入淡出

## `assets/rooster.m4a` —— 公鸡

- 原始文件：[Kokrhající slepice, 2024-04-01, 07 44 58.mp3](https://commons.wikimedia.org/wiki/File:Kokrhaj%C3%ADc%C3%AD_slepice,_2024-04-01,_07_44_58.mp3)
- 作者：Draceane
- 授权：**CC BY-SA 4.0**
- 改动：整段 3.0s，归一化，首尾 30ms 淡入淡出

## `assets/dog.m4a` —— 大型犬

- 原始文件：[A dog making noises and barking.flac](https://commons.wikimedia.org/wiki/File:A_dog_making_noises_and_barking.flac)
- 作者：Amada44
- 授权：**CC BY-SA 3.0**
- 改动：截取第 8.70s 起的 2.6s，归一化，首尾 30ms 淡入淡出

## 合成音（无第三方素材）

蚊子和 On-call 告警没有用录音，是 WebAudio 现场合成的：

- **蚊子** —— 窄带通锯齿波 + 随机声道漂移 + 忽远忽近。Commons 上没有可用的蚊子录音，
  而蚊子本来就是纯音加翅频调制，合成比录音更像。
- **On-call 告警** —— 方波三连。真实的 P1 告警本来就是合成音，用录音反而不对。

另外，所有角色的合成音都保留着：如果 `assets/` 里的录音加载失败，闹钟会自动退回合成，
不会变哑。

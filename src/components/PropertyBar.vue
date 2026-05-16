<script setup>
import { ref, watch, nextTick, toRaw } from "vue";
import { CROP_MODES } from "../constants/cropModes";
import CropConfigEditor from "./CropConfigEditor.vue";
import ConfigPresetManager from "./ConfigPresetManager.vue";

const props = defineProps({
  config: { type: Object, required: true },
  within: { type: String, default: "canvas" },
});

const emit = defineEmits(["update:config", "update:within"]);

// 親からの値を受けて、ローカルで扱うためのリアクティブデータ
const localConfig = ref(structuredClone(props.config));
// プロパティの更新がループしてしまうことを防ぐ
let isChangingByUI = false; // 操作中フラグ (ユーザーが直接プロパティを操作している時は親からの更新を受け付けない)
let isSyncingFromStore = false; // ストア（親）からの変更を適用している最中か
let isUpdatePending = false; // 予約フラグ (コンポーネント内のリアクティブの一連の変更を待って最終的な値をイベントアップするためのフラグ)
// 縦横比の値を固定するかどうか
const isRatioFixed = ref(false);

// 親の値が変わった時に、ローカル値を更新する
watch(
  () => props.config,
  (newVal) => {
    if (isChangingByUI) return; // ユーザーが入力中のときは何もしない
    isSyncingFromStore = true; // 「ストアからの同期を開始」
    localConfig.value = structuredClone(newVal);

    nextTick(() => {
      isSyncingFromStore = false; // 同期終了
    });
  },
  { deep: true, immediate: true },
);

// 入力イベント：親へ変更を通知
const emitUpdate = () => {
  // もし「親からの更新」によってここが動いた場合は、再送(emit)しない
  // nextTickで更新が終わるまでは新しくイベントアップしない
  if (isSyncingFromStore || isUpdatePending) return;

  // --- ここから送信処理 ---
  isChangingByUI = true; // ロックをかける
  isUpdatePending = true; // 更新を予約する
  nextTick(() => {
    emit("update:config", structuredClone(toRaw(localConfig.value)));
    // ストア経由で props が戻ってくるまでの時間を考慮して nextTick で解除
    isChangingByUI = false; // ロックを解除
    isUpdatePending = false; // 予約解除
  });
};

// モードが変更された時に親へ通知する
const handleWithinChange = (event) => {
  emit("update:within", event.target.value);
};

// 座標やサイズなど、直接的な値の変更を監視
watch(
  () => localConfig.value,
  () => {
    emitUpdate();
  },
  { deep: true },
);

// モードとチェックボックスの同期制御ロジック
watch(
  [
    () => localConfig.value.mode,
    () => isRatioFixed.value,
    () => localConfig.value.ratio.width,
    () => localConfig.value.ratio.height,
  ],
  ([mode, fixed]) => {
    if (isSyncingFromStore) return;

    let nextMode = mode;
    if (mode === CROP_MODES.FIXED_SIZE) {
      nextMode = CROP_MODES.FIXED_SIZE;
    } else {
      nextMode = fixed ? CROP_MODES.RATIO : CROP_MODES.FREE;
    }

    if (localConfig.value.mode !== nextMode) {
      localConfig.value.mode = nextMode;
    }
  },
);
</script>

<template>
  <div class="property-bar">
    <CropConfigEditor
      v-model="localConfig"
      v-model:is-ratio-fixed="isRatioFixed"
      variant="full"
    />

    <div class="property-group limit-group">
      <div class="input-group limit-group">
        <label for="within-select">切り抜き範囲 :</label>
        <select
          id="within-select"
          class="within-select"
          :value="within"
          @change="handleWithinChange"
        >
          <option value="canvas">自由（制限なし）</option>
          <option value="image">画像内側</option>
        </select>
      </div>
    </div>

    <ConfigPresetManager :local-config="localConfig" class="preset-trigger"
      >設定の保存と読込</ConfigPresetManager
    >
  </div>
</template>

<style scoped>
.property-bar {
  display: flex; /* 💡 Grid から Flex に変更 */
  flex-wrap: wrap; /* 💡 横幅が狭くなったら自動で次の行に折り返す設定 */
  align-items: center;
  justify-content: center;
  justify-content: flex-start;
  gap: 8px 16px; /* 横の隙間と、折り返した時の縦の隙間 */
  padding: 4px 12px;
  background: var(--color-bg-inset);
  border-bottom: 1px solid #ccc;
  min-height: 40px; /* 高さを一定に保つ */
  font-size: 13px;
  color: #333;
  width: fit-content;
  max-width: 100%;
}

.property-group {
  display: flex;
  align-items: center;
  flex-wrap: nowrap; /* グループ内では絶対に改行させない */
  gap: 12px;
}

.property-group.limit-group {
  align-self: end;
}

.preset-trigger {
  align-self: end;
  margin-left: auto;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap; /* ラベルの改行を防ぐ */
}

/* 入力欄のサイズを制限 */
.input-group select {
  width: 70px; /* 7桁程度が入る幅 */
  height: 24px; /* 高さを固定 */
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 2px;
  background: #fff;
  font-family: monospace; /* 数字を見やすく */
}

.within-select {
  min-width: 140px;
}

/* インプット欄のエラー通知用スタイル */
.input-group input.is-error {
  border-color: #ff4d4f;
  background-color: #fff2f0;
}

.input-group input.is-error:focus {
  outline: none;
  border-color: #ff7875;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

input:disabled {
  background-color: #eee;
  color: #888;
  border-color: #ddd;
  cursor: not-allowed;
}

/* スマートフォン向けのレスポンシブ設定 */
@media (max-width: 768px) {
  .property-bar {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .property-bar {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

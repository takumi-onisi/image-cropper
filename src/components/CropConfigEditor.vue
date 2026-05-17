<script setup>
import { computed } from "vue";
import { CROP_MODES } from "../constants/cropModes";

const props = defineProps({
  // v-model で受け取る設定オブジェクト
  modelValue: {
    type: Object,
    required: true,
  },
  // 縦横比を固定するかどうかのフラグ（親から同期させる）
  isRatioFixed: {
    type: Boolean,
    default: false,
  },
  // 'full' (プロパティバー用) または 'compact' (ダイアログ一覧用)
  variant: {
    type: String,
    default: "full",
  },
});

const emit = defineEmits(["update:modelValue", "update:isRatioFixed"]);

// データのショートカット（参照渡しなのでプロパティの直接変更はVueが検知可能）
const localConfig = computed(() => props.modelValue);

// 縦横比固定のバインディング
const localIsRatioFixed = computed({
  get: () => props.isRatioFixed,
  set: (val) => emit("update:isRatioFixed", val),
});

// プルダウン用の「見た目上のモード」
const displayMode = computed({
  get() {
    // 内部が FREE または RATIO のときは、プルダウンでは「比率」に見せる
    if (
      localConfig.value.mode === CROP_MODES.FREE ||
      localConfig.value.mode === CROP_MODES.RATIO
    ) {
      return "RATIO_GROUP";
    }
    return localConfig.value.mode;
  },
  set(val) {
    // プルダウンで「比率」が選ばれたら、ここでは FREE にしておく
    // RATIO にすべきか判断するのはlocalIsRatioFixedロジックが行う
    if (val === "RATIO_GROUP") {
      localConfig.value.mode = CROP_MODES.FREE;
    } else {
      localConfig.value.mode = val;
    }
  },
});

// 表示用セレクションサイズの計算
const displaySelection = computed(() => {
  const { selection, targetSize, mode } = localConfig.value;

  if (mode !== CROP_MODES.FIXED_SIZE) {
    return selection;
  }

  // 固定サイズモード時のスケール計算 (target / selection_view)
  // セレクションの枠が「出力サイズに対してどの位置にあるか」
  const scale = targetSize.width / (selection.width || 1);

  return {
    x: Math.round(selection.x * scale),
    y: Math.round(selection.y * scale),
    width: targetSize.width,
    height: targetSize.height,
  };
});

// X, Y 座標の逆算ロジック
const updateCoord = (key, value) => {
  if (localConfig.value.mode !== CROP_MODES.FIXED_SIZE) {
    localConfig.value.selection[key] = value;
  } else {
    // スケールを計算して逆算
    const scale =
      localConfig.value.targetSize.width /
      (localConfig.value.selection.width || 1);
    localConfig.value.selection[key] = value / scale;
  }
};

// v-model 用の個別 computed
const inputX = computed({
  get: () => displaySelection.value.x,
  set: (val) => updateCoord("x", val),
});

// v-model 用の個別 computed
const inputY = computed({
  get: () => displaySelection.value.y,
  set: (val) => updateCoord("y", val),
});
</script>

<template>
  <div class="crop-config-editor" :class="variant">
    <div class="property-group mode-group">
      <div class="input-group">
        <select v-model="displayMode" class="display-mode-select">
          <option value="RATIO_GROUP">比率</option>
          <option :value="CROP_MODES.FIXED_SIZE">幅×高さ</option>
        </select>
      </div>

      <div v-if="displayMode === 'RATIO_GROUP'" class="input-group-container">
        <div class="input-group">
          <label>幅 :</label>
          <input
            type="number"
            v-model.number="localConfig.ratio.width"
            :class="{
              'is-error': localIsRatioFixed && !localConfig.ratio.width,
            }"
          />
        </div>
        <div class="input-group">
          <label>高さ :</label>
          <input
            type="number"
            v-model.number="localConfig.ratio.height"
            :class="{
              'is-error': localIsRatioFixed && !localConfig.ratio.height,
            }"
          />
        </div>
        <div class="input-group checkbox-group" v-if="variant === 'full'">
          <input
            type="checkbox"
            v-model="localIsRatioFixed"
            :id="`fix-ratio-${variant}`"
          />
          <label :for="`fix-ratio-${variant}`">縦横比を固定</label>
        </div>
      </div>

      <div
        v-else-if="displayMode === CROP_MODES.FIXED_SIZE"
        class="input-group-container"
      >
        <div class="input-group">
          <label>幅 :</label>
          <input type="number" v-model.number="localConfig.targetSize.width" />
          <span class="unit">px</span>
        </div>
        <div class="input-group">
          <label>高さ :</label>
          <input type="number" v-model.number="localConfig.targetSize.height" />
          <span class="unit">px</span>
        </div>
      </div>
    </div>

    <div class="property-group coord-group">
      <div class="input-group">
        <label>X :</label>
        <input type="number" v-model.number="inputX" />
        <span class="unit">px</span>
      </div>
      <div class="input-group">
        <label>Y :</label>
        <input type="number" v-model.number="inputY" />
        <span class="unit">px</span>
      </div>
      <div class="input-group">
        <label>幅 :</label>
        <input
          type="number"
          v-model.number="displaySelection.width"
          :disabled="localConfig.mode === CROP_MODES.FIXED_SIZE"
        />
        <span class="unit">px</span>
      </div>
      <div class="input-group">
        <label>高さ :</label>
        <input
          type="number"
          v-model.number="displaySelection.height"
          :disabled="localConfig.mode === CROP_MODES.FIXED_SIZE"
        />
        <span class="unit">px</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crop-config-editor {
  display: grid;
  align-items: center;
  justify-content: center;
  gap: 8px 16px; /* 横の隙間と、折り返した時の縦の隙間 */
  background: var(--color-bg-inset);
  min-height: 40px; /* 高さを一定に保つ */
  font-size: 13px;
  color: #333;
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
}

.property-group {
  display: flex;
  align-items: center;
  flex-wrap: nowrap; /* グループ内では絶対に改行させない */
  gap: 12px;
}

.ratio_group,
.input-group-container {
  display: flex;
  align-items: center;
  gap: 12px; /* グループ内の要素間隔 */
  flex-wrap: nowrap;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap; /* ラベルの改行を防ぐ */
}

/* 入力欄のサイズを制限 */
.input-group input[type="number"],
.input-group select {
  width: 70px; /* 7桁程度が入る幅 */
  height: 24px; /* 高さを固定 */
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 2px;
  background: #fff;
  font-family: monospace; /* 数字を見やすく */
}

.display-mode-select {
  min-width: 100px;
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

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 左側グループ：アスペクト比や範囲制限 */
.left-group {
  flex: 0 1 auto;
}

/* 右側グループ：X, Y, W, H */
.right-group {
  flex: 0 1 auto;
  justify-content: flex-end; /* 右寄せ（横並び時） */
}

/* 単位(px)のラベル */
.unit {
  font-size: 11px;
  color: #666;
  margin-left: -2px;
}

/* 区切り線：PCでは縦線、スマホ(狭い画面)では非表示にして改行を促す */
.divider {
  width: 1px;
  height: 20px;
  background-color: #ccc;
  margin: 0 4px;
}

/* スマートフォン向けのレスポンシブ設定 */
@media (max-width: 768px) {
  .property-group {
    flex-wrap: wrap; /* グループ内での折り返しを許容する */
  }

  .divider {
    display: none; /* 区切り線を消す */
  }

  /* 2段に分けるためのダミー要素（dividerの代わりに挿入するイメージ） */
  /* もしくは divider の位置で強制改行させる場合 */
  .divider {
    display: block;
    width: 100%; /* 横幅いっぱいに広げて強制改行させる */
    height: 0;
    background: transparent;
    margin: 0;
  }

  .input-group-container {
    gap: 8px; /* 隙間を少し詰める */
  }

  /* チェックボックスのグループを強制的に次の行へ送る設定 */
  .checkbox-group {
    flex-basis: 100%; /* 横幅を100%確保することで、強制的に改行させる */
    margin-top: 4px; /* 上の入力欄との間に少し隙間を作る */
  }
}

@media (max-width: 560px) {
  .input-group-container {
    flex-wrap: wrap;
  }
  .input-group {
    white-space: nowrap; /* ラベルの改行を防ぐ */
  }
}
</style>

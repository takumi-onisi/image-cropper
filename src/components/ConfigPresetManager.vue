<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { getPresets, savePresets } from "../utils/storage";
import CropConfigEditor from "./CropConfigEditor.vue";

const props = defineProps({
  // 現在のプロパティバーでの設定値
  localConfig: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(["apply-preset"]);

const isDialogOpen = ref(false);
const presets = ref([]);
const newPresetName = ref("");

// プリセットの読み込み
const loadPresetsFromStorage = () => {
  presets.value = getPresets();
};

// 現在の設定を保存
const handleSave = () => {
  const newPreset = {
    id: Date.now(),
    name: newPresetName.value ? newPresetName.value : "",
    config: JSON.parse(JSON.stringify(props.localConfig)), // ディープコピー
  };

  presets.value.push(newPreset);
  savePresets(presets.value);
  newPresetName.value = ""; // 入力欄をクリア
};

// プリセットの適用（親へ通知）
const handleApply = (presetConfig) => {
  emit("apply-preset", JSON.parse(JSON.stringify(presetConfig)));
  isDialogOpen.value = false;
};

// プリセットの削除
const handleDelete = (id) => {
  presets.value = presets.value.filter((p) => p.id !== id);
  savePresets(presets.value);
};

onMounted(loadPresetsFromStorage);
</script>

<template>
  <div class="preset-manager">
    <button @click="isDialogOpen = true" class="btn-open">
      <slot></slot>
    </button>

    <Teleport to="body">
      <div
        v-if="isDialogOpen"
        class="modal-overlay"
        @click.self="isDialogOpen = false"
      >
        <div class="modal-content">
          <button
            @click="isDialogOpen = false"
            class="btn-close-top"
            aria-label="閉じる"
          >
            ×
          </button>
          <h3>切り抜き設定の保存</h3>

          <div class="config-row current-config">
            <div class="preset-name-area">
              <input
                v-model="newPresetName"
                placeholder="保存名を入力"
                class="name-input"
              />
            </div>
            <div class="config-main-content">
              <div class="config-preview">
                <CropConfigEditor
                  v-model="props.localConfig"
                  variant="compact"
                />
              </div>
              <div class="actions">
                <button @click="handleSave" class="btn-save">保存</button>
              </div>
            </div>
          </div>

          <hr />

          <h3>保存済み設定</h3>
          <div class="preset-list">
            <div v-for="preset in presets" :key="preset.id" class="config-row">
              <div class="preset-name-area">
                <span class="preset-name">{{ preset.name }}</span>
              </div>
              <div class="config-main-content">
                <div class="config-preview">
                  <CropConfigEditor v-model="preset.config" variant="compact" />
                </div>
                <div class="actions">
                  <button @click="handleApply(preset.config)" class="btn-apply">
                    適用
                  </button>
                  <button @click="handleDelete(preset.id)" class="btn-delete">
                    削除
                  </button>
                </div>
              </div>
            </div>
            <p v-if="presets.length === 0" class="empty-msg">
              保存された設定はありません
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* モーダルの基本スタイル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: fit-content;
  max-width: calc(100vw - 48px);
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

h3 {
  font-size: var(--font-size-lg);
  line-height: 1.3;
  color: var(--text-main);
}

hr {
  border: none; /* デフォルトの立体的な線を消す */
  border-top: 1px solid #ddd; /* フラットで綺麗な細い線にする */
  margin: 24px 0;
  width: 100%;
}

.config-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.preset-name-area {
  display: flex;
  align-items: center;
  min-height: 1.2em;
}

.preset-name {
  font-weight: bolder;
  color: #333;
  margin-right: auto;
}

.preset-name.is-empty {
  opacity: 0;
}

/* 💡 エディタとボタンを横並びにするコンテナ */
.config-main-content {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.config-preview {
  font-size: 0.9em;
  color: #666;
}

.actions {
  display: flex;
  gap: 8px;
  white-space: nowrap; /* ボタンの改行を防ぐ */
  align-self: end;
}

/* --- 共通のボタン基本形 --- */
button {
  padding: 3px 6px;
  font-size: var(--font-size-base);
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-close-top {
  position: absolute;
  top: 12px; /* 上からの距離 */
  right: 12px; /* 💡 変更：left から right にすることで右上に固定されます */

  background: none;
  border: none;
  font-size: 20px;
  font-weight: bold;
  color: #999;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  transition: color 0.2s;
}

.btn-close-top:hover {
  color: #333;
}

.btn-open {
  padding: 3px 6px; /* 💡 他の入力欄と高さを揃えるため、少し上下をスリムに */
  font-size: 13px;
  font-weight: 500; /* 太字にせず、テキストと同じプレーンな太さに */
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;

  background-color: #fafafa;
  border: 1px solid #ccc;
  color: #333;
}

.btn-open:hover {
  background-color: #f0f0f0;
  border-color: #bbb;
}

.btn-open:active {
  background-color: #e5e5e5;
}

/* 💾 新規保存（この画面の主役なので、一番目立たせる） */
.btn-save {
  background-color: var(--primary-color);
  color: white;
}
.btn-save:hover {
  background-color: #0052a3;
}

/* ⚡ 適用（保存済みの行で使う、ポジティブなサブボタン） */
.btn-apply {
  background-color: transparent;
  border-color: var(--primary-color);
  color: var(--primary-color);
}
.btn-apply:hover {
  background-color: var(--primary-color);
  color: white;
}

/* 🗑️ 削除（危険なボタン：普段は優しく、ホバーで警告を強める） */
.btn-delete {
  background-color: white;
  border-color: #ffa39e;
  color: #ff4d4f;
}
.btn-delete:hover {
  background-color: #ff4d4f;
  border-color: #ff4d4f;
  color: white; /* ホバーした時だけ真っ赤にして強い警告にする */
}
</style>

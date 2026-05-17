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
          <h3>切り抜き設定の管理</h3>

          <div class="config-row current-config">
            <input
              v-model="newPresetName"
              placeholder="設定名を入力..."
              class="name-input"
            />
            <div class="config-preview">
              <CropConfigEditor v-model="props.localConfig" variant="compact" />
            </div>
            <button @click="handleSave" class="btn-save">
              現在の設定を保存
            </button>
          </div>

          <hr />

          <div class="preset-list">
            <div v-for="preset in presets" :key="preset.id" class="config-row">
              <span class="preset-name">{{ preset.name }}</span>
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
            <p v-if="presets.length === 0" class="empty-msg">
              保存された設定はありません
            </p>
          </div>

          <button @click="isDialogOpen = false" class="btn-close">
            閉じる
          </button>
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
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}
.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.config-preview {
  flex-grow: 1;
  font-size: 0.9em;
  color: #666;
}
/* その他ボタンなどの装飾は既存のテーマに合わせて調整 */
</style>

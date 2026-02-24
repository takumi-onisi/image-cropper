<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useImagesStore } from "../stores/imagesStore";
import Cropper from "cropperjs";

const imageStore = useImagesStore();
const imageElement = ref(null);
let cropper = null;

// 一枚目の画像を取得
const firstImage = computed(() => imageStore.fileList[0]);

const initCropper = () => {
  if (cropper) cropper.destroy();
  if (!imageElement.value) return;

  cropper = new Cropper(imageElement.value, {
    viewMode: 1,
    movable: true,
    zoomable: true,
  });
};

// 一枚目の画像が読み込まれたら初期化
watch(
  firstImage,
  () => {
    // DOMが更新されるのを待ってから初期化
    setTimeout(initCropper, 100);
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="firstImage" class="cropper-container">
    <img ref="imageElement" :src="firstImage.previewUrl" class="cropper-img"/>
    <button>切り抜き</button>
  </div>
</template>

<style scoped>
.cropper-img{
    display: block;
    max-width: 100%;
}
</style>

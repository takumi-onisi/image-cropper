<script setup>
import { useTemplateRef, ref, computed, onMounted, watch } from "vue";
import { useImagesStore } from "../stores/imagesStore";
import { CROPPER_TEMPLATE } from "../constants/cropperTemplate";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Cropper from "cropperjs";
import { performCropping } from "../utils/imageProcessor";

const imageStore = useImagesStore();
const imageElement = useTemplateRef("imageElement");
let cropper = null;

// 一枚目の画像を取得
const firstImage = computed(() => imageStore.fileList[0]);

const initCropper = () => {
  if (cropper) cropper.destroy();
  if (!imageElement.value) return;

  cropper = new Cropper(imageElement.value, { template: CROPPER_TEMPLATE });
};

const saveConfig = () => {
  if (!cropper) return;

  // データを取得
  const cropperSelection = cropper.getCropperSelection();
  const cropperImage = cropper.getCropperImage();

  if (!cropperSelection || !cropperImage) return;

  // 枠の座標とサイズを取得
  const selectionData = {
    x: cropperSelection.x,
    y: cropperSelection.y,
    width: cropperSelection.width,
    height: cropperSelection.height,
  };

  // 画像の変形状態（移動・拡大・回転）を取得
  const imageData = cropperImage.$getTransform();
  console.log(imageData);
};

const testResultUrl = ref(null);

const confirmCrop = async () => {
  if (!cropper) return;

  const cropperSelection = cropper.getCropperSelection();
  const cropperImage = cropper.getCropperImage();
  if (!cropperSelection || !cropperImage) return;

  // 代表の設定をストアに保存(これが各ファイルにデフォルトのcropConfigとして設定される)
  imageStore.setGlobalConfig({
    selection: {
      x: cropperSelection.x,
      y: cropperSelection.y,
      width: cropperSelection.width,
      height: cropperSelection.height,
    },
    transform: cropperImage.$getTransform(),
  });

  processAll();
};

const generateCanvas = async (fileItem) => {
  if (!fileItem?.previewUrl) throw new Error("不正なデータ");

  // DOMの構築（副作用）
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px"; // 画面外へ飛ばす
  container.style.top = "0";
  container.style.opacity = "0";
  document.body.appendChild(container);
  // コンテナとimg要素を実際のdomに追加しないとcropperが正常に動作しない
  const img = document.createElement("img");
  container.appendChild(img);

  try {
    // 画像読み込みのPromiseをラップ
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () =>
        reject(new Error(`画像読み込み失敗: ${fileItem.name}`));
      img.src = fileItem.previewUrl; // 画像の読み込み開始
    });

    // ロジックの実行（performCroppingへ委譲）
    return await performCropping(img, fileItem.cropConfig);
  } finally {
    // 後片付け（副作用）
    if (container.parentNode) document.body.removeChild(container);
  }
};

const processAll = async () => {
  const files = imageStore.fileList;
  const processedCanvases = [];

  for (const file of files) {
    try {
      // 1枚ずつ順番に await
      const canvas = await generateCanvas(file);

      // 成功したら配列に保存（またはZIPに追加）
      processedCanvases.push({
        name: file.name,
        canvas: canvas,
      });

      console.log(`成功: ${file.name}`);
    } catch (err) {
      // reject された場合でも、ここでキャッチすればループは止まらない
      console.error(`失敗: ${file.name} - 理由: ${err.message}`);
      // 必要に応じてユーザーに「失敗したファイルがある」ことを知らせるフラグを立てる
    }
  }

  console.log("全件の処理が完了しました", processedCanvases);

  // ZIP化を実行
  await downloadAsZip(processedCanvases);
  // メモリ解放：Canvas要素は巨大なので使い終わったらクリアするのが安全
  processedCanvases.forEach(item => {
    item.canvas.width = 0;
    item.canvas.height = 0;
  });
};

/**
 * processedCanvases: { name: string, canvas: HTMLCanvasElement }[]
 */
const downloadAsZip = async (processedCanvases) => {
  if (processedCanvases.length === 0) return;

  const zip = new JSZip();

  // 各CanvasをBlobに変換してZIPに追加
  const promises = processedCanvases.map(async (item) => {
    return new Promise((resolve) => {
      // toBlobを使ってPNG形式のバイナリを取り出す
      item.canvas.toBlob((blob) => {
        // 拡張子を整理（元の名前がimage.jpgでも、切り抜き後はimage.pngにする）
        const fileName = item.name.replace(/\.[^/.]+$/, "") + ".png";
        
        // ZIPファイル構造の中にファイルを追加
        zip.file(fileName, blob);
        resolve();
      }, "image/png");
    });
  });

  // 全てのBlob変換が終わるのを待つ
  await Promise.all(promises);

  // ZIPデータを生成（圧縮レベルなども設定可能）
  const zipContent = await zip.generateAsync({ type: "blob" });

  // ブラウザのダウンロード機能を実行
  saveAs(zipContent, "cropped_images.zip");
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
    <img ref="imageElement" :src="firstImage.previewUrl" class="cropper-img" />
    <button @click="confirmCrop">設定を確定してテスト切り抜き</button>
  </div>

  <div v-if="testResultUrl" class="test-preview">
    <h3>テスト切り抜き結果:</h3>
    <img :src="testResultUrl" style="border: 2px solid #2ecc71" />
  </div>
</template>

<style scoped>
.cropper-img {
  display: block;
  max-width: 100%;
}
/* 画像の上で移動用ポインターを表示 */
cropper-image[action="move"] {
  cursor: move; /* 十字矢印のポインター */
}
</style>

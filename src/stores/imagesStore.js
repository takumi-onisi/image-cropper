import { defineStore } from "pinia";
import { ref } from "vue";

export const useImagesStore = defineStore("images", () => {
  const fileList = ref([]);

  const addFiles = (files) => {
    // files は FileList という特殊な型なので、Array.fromで配列化が必要
    const newEntries = Array.from(files).map((file) => {
      return {
        id: crypto.randomUUID(), // v-for用のkey
        file: file, // 生のファイルデータ
        name: file.name,
        // ファイルにアクセスできるようにブラウザのメモリにファイルへのURLを発行する
        // ブラウザのメモリリーク防止のためにメモリのクリアも作成すること
        previewUrl: URL.createObjectURL(file),
      };
    });

    // 既存のリストの後ろに追加
    fileList.value = [...fileList.value, ...newEntries];
  };

  const clearFiles = () => {
    // メモリーリーク防止のために、生成したURLを解放してからクリア
    fileList.value.forEach((item) => URL.revokeObjectURL(item.previewUrl)); // URLの開放
    fileList.value = []; // ファイルリストをクリア
  };

  return {
    fileList,
    addFiles,
    clearFiles,
  };
});

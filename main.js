// 最後に表示した画像URL（同じ画像が連続で出ないように使う）
let lastImageUrl = null;

// 現在のモード（"normal" or "gallery"）
let mode = "normal";

// ギャラリービューで何ページ目を表示しているか
let currentPage = 0;
const ITEMS_PER_PAGE = 4;

// プリロード画像のバッファ
const preloadQueue = [];
const BUFFER_SIZE = 10; // バッファにためておく画像数

// すでに表示した画像たちの記録
const shownImages = [];

// DOM要素の取得
const btn = document.getElementById("btn");
const img = document.getElementById("dogImg");
const errorMsg = document.getElementById("errorMsg");

// ギャラリーモードの切り替えボタン処理
document.getElementById("toggleModeBtn").addEventListener("click", () => {
	mode = mode === "normal" ? "gallery" : "normal";
	toggleMode(mode);
});

// モードごとのUI表示切り替え
function toggleMode(currentMode) {
	const galleryWrapper = document.getElementById("galleryWrapper");
	const gallery = document.getElementById("galleryContainer");

	if (currentMode === "gallery") {
		btn.style.display = "none";
		img.style.display = "none";
		img.src = ""; // ← これを追加して、画像自体もクリア
		galleryWrapper.style.display = "flex";
		renderGallery(); // ギャラリーを描画
		document.body.style.overflow = "hidden";
	} else {
		btn.style.display = "block";
		img.style.display = "block";
		img.src = ""; // 念のためノーマル復帰時も状態リセット
		galleryWrapper.style.display = "none";
		document.body.style.overflow = "auto";

		showBufferedImage();
	}
}

function showBufferedImage() {
	if (preloadQueue.length === 0) {
		errorMsg.textContent = "画像を準備中です…！少々お待ちを🐶";
		errorMsg.style.display = "block";
		return;
	}

	const nextImg = preloadQueue.shift();

	if (!nextImg || !nextImg.src) {
		errorMsg.textContent = "画像の読み込みに失敗しました…🙇‍♂️";
		errorMsg.style.display = "block";
		return;
	}

	img.src = nextImg.src;
	img.style.display = "block";
	lastImageUrl = nextImg.src;

	if (!shownImages.includes(nextImg.src)) {
		shownImages.push(nextImg.src);
	}
	errorMsg.style.display = "none";
	// 次のバッファを非同期で追加
	fillPreloadBuffer();
}

// 画像を事前に取得してバッファに詰める
async function fillPreloadBuffer() {
	while (preloadQueue.length < BUFFER_SIZE) {
		const res = await fetch("https://random.dog/woof.json");
		const data = await res.json();

		// 動画ファイルはスキップ（画像だけ扱う）
		if (data.url.endsWith(".mp4") || data.url.endsWith(".webm") || data.url.endsWith(".gif")) continue;

		// 前回と同じ画像はスキップ
		if (data.url === lastImageUrl) continue;

		const img = new Image();
		img.src = data.url;

		// 読み込み完了を待つ（表示エラーも検知）
		await new Promise(resolve => {
			img.onload = resolve;
			img.onerror = resolve;
		});

		preloadQueue.push(img); // バッファに追加
	}
}

// ページ読み込み時：バッファを埋めて最初の画像を表示
window.addEventListener("load", async () => {
	await fillPreloadBuffer();
	showBufferedImage();
});

// ギャラリーモードのサムネイル表示生成
function renderGallery() {
	const gallery = document.getElementById("galleryContainer");
	gallery.innerHTML = ""; // 一度クリア

	const start = currentPage * ITEMS_PER_PAGE;
	const end = start + ITEMS_PER_PAGE;
	const pageItems = shownImages.slice(start, end);

	pageItems.forEach(url => {
		const thumb = document.createElement("img");
		thumb.src = url;
		// スタイル
		thumb.style.width = "120px";
		thumb.style.margin = "10px";
		thumb.style.borderRadius = "6px";
		thumb.style.cursor = "pointer";
		thumb.addEventListener("click", () => {
			showModal(url);
		})
		gallery.appendChild(thumb);
	});
}

document.getElementById("leftBtn").onclick = () => {
	if (currentPage > 0) {
		currentPage--;
		renderGallery();
	}
};

document.getElementById("rightBtn").onclick = () => {
	if ((currentPage + 1) * ITEMS_PER_PAGE < shownImages.length) {
		currentPage++;
		renderGallery();
	}
};

// モーダル（拡大画像）を表示
function showModal(src) {
	const overlay = document.getElementById("modalOverlay");
	const modalImg = document.getElementById("modalImg");

	// すでに表示中なら画像だけ切り替える
	if (overlay.style.display === "flex") {
		modalImg.src = src;
	} else {
		modalImg.src = src;
		overlay.style.display = "flex";
	}

	// 背景クリックで閉じる
	overlay.onclick = () => {
		overlay.style.display = "none";
	};
}

// 「犬を表示」ボタンのクリック処理
btn.addEventListener("click", async () => {
	showBufferedImage();
});

// 最後に表示した画像URL（同じ画像が連続で出ないように使う）
let lastImageUrl = null;

// 現在のモード（"normal" or "gallery"）
let mode = "normal";

//読み込み開始時間
let startTime = Date.now();

// ギャラリービューで何ページ目を表示しているか
let currentPage = 0;
const ITEMS_PER_PAGE = 4;
const ITEM_WIDTH = 136; // サムネイル幅 120px + gap 16px


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

	document.getElementById("toggleModeBtn").textContent =
		currentMode === "gallery" ? "ノーマルモードに切り替え" : "ギャラリーモードに切り替え";

	const galleryWrapper = document.getElementById("galleryWrapper");
	const gallery = document.getElementById("galleryContainer");
	const sliderWrapper = document.getElementById("sliderWrapper");
	if (currentMode === "gallery") {
		sliderWrapper.style.display = "block";
	} else {
		sliderWrapper.style.display = "none";
	}


	if (currentMode === "gallery") {
		btn.style.display = "none";
		img.style.display = "none";
		img.src = ""; // ← これを追加して、画像自体もクリア
		img.style.width = "0";
		img.style.height = "0";
		img.style.minHeight = "0";
		img.style.backgroundColor = "transparent";

		galleryWrapper.style.display = "block";
		renderGallery(); // ギャラリーを描画
		updateSliderEvents(); // ← 🔥 この追加が効く！
		document.body.style.overflow = "hidden";
		document.body.style.overscrollBehavior = "contain";
	} else {
		btn.style.display = "block";
		img.style.display = "block";
		img.src = ""; // 念のためノーマル復帰時も状態リセット
		img.style.width = "500px";
		img.style.height = "auto";
		img.style.minHeight = "300px";
		img.style.backgroundColor = "#f0f0f0";

		galleryWrapper.style.display = "none";
		document.body.style.overflow = "auto";
		document.body.style.overscrollBehavior = "auto";

		showBufferedImage();
	}
}

function updateProgressBarTimed() {
	const wrapper = document.getElementById("progressWrapper"); // ← これが必要！
	const bar = document.getElementById("progressBar");

	const TOTAL_LOAD_DURATION = 3000;// 読み込みにかかる平均時間（ミリ秒）
	const elapsed = Date.now() - startTime;
	const percent = Math.min(100, Math.floor((elapsed / TOTAL_LOAD_DURATION) * 100));
	bar.style.width = percent + "%";

	wrapper.style.display = "block";

	if (percent < 100) {
		// 50msごとに再更新（進捗が100%未満のうちは）
		setTimeout(updateProgressBarTimed, 50);// ← 再帰更新
	} else {
		// 読み込み完了後にバー非表示
		setTimeout(() => {
			wrapper.style.display = "none";
		}, 500);
	}
}

function showBufferedImage() {
	if (preloadQueue.length === 0) {
		errorMsg.textContent = "画像を準備中です…！少々お待ちを🐶";
		errorMsg.style.display = "block";

		// タイマー初期化＋バー進行開始
		startTime = Date.now();
		updateProgressBarTimed();

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

	// 並列で画像の事前取得する関数
	const fetchImage = async () => {
		try {
			const res = await fetch("https://random.dog/woof.json");
			const data = await res.json();

			// 無効な形式や重複画像はスキップ
			if (
				!data.url ||
				data.url === lastImageUrl ||
				data.url.endsWith(".mp4") ||
				data.url.endsWith(".webm") ||
				data.url.endsWith(".gif")
			) return null;

			const img = new Image();
			img.src = data.url;

			return new Promise(resolve => {
				img.onload = () => resolve(img);
				img.onerror = () => resolve(null);// エラーでも resolve
			});
		} catch (e) {
			return null;
		}
	};

	// バッファ不足分だけ同時取得
	const tasks = [];
	while (preloadQueue.length + tasks.length < BUFFER_SIZE) {
		tasks.push(fetchImage());
	}

	const results = await Promise.all(tasks);
	results.forEach(img => {
		if (img) {
			preloadQueue.push(img);
		}
	});

	// バッファに最低1枚あればメッセージを非表示
	if (preloadQueue.length >= 1) {
		errorMsg.style.display = "none";
	}
}


// ギャラリーモードのサムネイル表示生成
function renderGallery() {
	const gallery = document.getElementById("galleryContainer");
	gallery.innerHTML = ""; // ← 前の表示を消す

	const maxPage = Math.ceil(shownImages.length / 9);
	for (let page = 0; page < maxPage; page++) {
		const group = document.createElement("div");
		group.style.display = "grid";
		group.style.gridTemplateColumns = "repeat(3, 1fr)";
		group.style.gridGap = "16px";
		group.style.scrollSnapAlign = "start";
		group.style.minWidth = "100%";
		group.style.padding = "20px";

		const start = page * 9;
		const end = start + 9;
		const pageImages = shownImages.slice(start, end);

		pageImages.forEach(url => {
			const thumb = document.createElement("img");
			thumb.src = url;
			thumb.style.width = "120px";
			thumb.style.height = "80px";
			thumb.style.objectFit = "cover";
			thumb.style.borderRadius = "6px";
			thumb.style.cursor = "pointer";
			thumb.addEventListener("click", () => showModal(url));
			group.appendChild(thumb);
		});

		gallery.appendChild(group);
	}

	updateSliderEvents();
}





document.getElementById("leftBtn").onclick = () => {
	const gallery = document.getElementById("galleryContainer");
	const pageWidth = ITEM_WIDTH * ITEMS_PER_PAGE;
	const currentScroll = gallery.scrollLeft;
	currentPage = Math.max(0, currentPage - 1);
	renderGallery();
	// 前のページにぴったり揃える
	const target = Math.max(0, Math.floor((currentScroll - 1) / pageWidth) * pageWidth);
	gallery.scrollTo({ left: target, behavior: "smooth" });
};

document.getElementById("rightBtn").onclick = () => {
	const gallery = document.getElementById("galleryContainer");
	const pageWidth = ITEM_WIDTH * ITEMS_PER_PAGE;
	const currentScroll = gallery.scrollLeft;
	const maxScroll = gallery.scrollWidth - gallery.clientWidth;
	currentPage = Math.max(0, currentPage - 1);
	renderGallery();
	// 次のページにぴったり揃える
	const target = Math.min(maxScroll, Math.ceil((currentScroll + 1) / pageWidth) * pageWidth);
	gallery.scrollTo({ left: target, behavior: "smooth" });
};


function updateSliderEvents() {
	const slider = document.getElementById("gallerySlider");
	const maxPage = Math.ceil(shownImages.length / 9);
	slider.max = maxPage - 1;

	slider.oninput = () => {
		currentPage = parseInt(slider.value, 10);
		renderGallery();
	};
	slider.value = currentPage;
}

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

window.addEventListener("load", async () => {

	// 初期モードのUIを整える（ラベル更新含む）
	toggleMode(mode);

	// ✅ 初期ロードメッセージとバー表示
	errorMsg.textContent = "画像を準備中です…！少々お待ちを🐶";
	errorMsg.style.display = "block";

	startTime = Date.now();// ← タイマー初期化
	updateProgressBarTimed();// ← バーの進行スタート！

	// バッファを埋めて最初の画像を表示
	await fillPreloadBuffer();
	showBufferedImage();
});

// 「犬を表示」ボタンのクリック処理
btn.addEventListener("click", async () => {
	showBufferedImage();
});

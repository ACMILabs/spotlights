/* eslint-disable no-loop-func */
const debugEl = document.createElement("div");
debugEl.style.position = "fixed";
debugEl.style.top = "0";
debugEl.style.left = "0";
debugEl.style.background = "#fff";
debugEl.style.zIndex = 1;
document.body.appendChild(debugEl);

window.addEventListener("error", e => {
  debugEl.innerHTML += `${e.message}. l${e.lineno}:c${e.colno}`;
});

function saveLabel(labelId) {
  fetch("http://localhost:8081/api/labels/", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    referrer: "no-referrer",
    body: JSON.stringify({
      datetime: Date.now(),
      label_id: labelId
    })
  });
}

const LIST_ITEM_WIDTH = 240;
const LIST_PADDING = 30;

const FRICTION = 0.9;
const MIN_LIST_VELOCITY = 0.02;
const MIN_TARGET_D = 0.02;
const MIN_DRAG = 10;

let isDragging = false;
let lastMouseX = 0;
let hasDragged = false;
let amountDragged = 0;

const playlistContent = window.playlist_labels.map(x => {
  return {
    id: x.label.id,
    title: x.label.title,
    secondaryTitle: x.label.title,
    description: x.label.description,
    video_url: x.resource,
    image_url: x.image,
    subtitles: `data:text/vtt;base64,${btoa(x.subtitles)}`
  };
});

// DOM

const root = document.getElementById("root");

const video = document.createElement("video");
root.appendChild(video);
video.className = "video";
video.autoplay = true;
video.defaultMuted = true;

const videoTrack = document.createElement("track");
video.appendChild(videoTrack);
videoTrack.default = true;

const videoProgress = document.createElement("div");
root.appendChild(videoProgress);
videoProgress.className = "video_progress";

const listCont = document.createElement("div");
root.appendChild(listCont);
listCont.className = "list_cont";

const list = document.createElement("div");
listCont.appendChild(list);
list.className = "list";

const listItems = [];
let currentIndex = 0;

// Build playlist DOM elements

for (let i = 0; i < playlistContent.length; i++) {
  const itemData = playlistContent[i];

  const item = document.createElement("div");
  listItems.push(item);
  list.appendChild(item);
  item.className = "list_item";
  item.style.backgroundImage = `url(${itemData.image_url})`;

  const title = document.createElement("div");
  item.appendChild(title);
  title.className = "list_item_title";
  title.innerHTML = itemData.title;

  const secondaryTitle = document.createElement("div");
  item.appendChild(secondaryTitle);
  secondaryTitle.className = "list_item_secondaryTitle";
  secondaryTitle.innerHTML = itemData.secondaryTitle;

  const description = document.createElement("div");
  item.appendChild(description);
  description.className = "list_item_description";
  description.innerHTML = itemData.description;

  item.addEventListener("click", e => {
    if (hasDragged) {
      e.preventDefault();
    } else if (listItems[currentIndex] !== item) {
      listItems[currentIndex].classList.remove("active");
      item.classList.add("active");
      video.src = playlistContent[i].video_url;
      videoTrack.src = `data:text/vtt;${playlistContent[i].subtitles}`;
      saveLabel(playlistContent[i].id);
      currentIndex = i;
    }
  });
}

// Arrows

const leftArrow = document.createElement("div");
listCont.appendChild(leftArrow);
leftArrow.className = "leftArrow";

const rightArrow = document.createElement("div");
listCont.appendChild(rightArrow);
rightArrow.className = "rightArrow";

// Dragging and post-arrow-click physics,
// Cache to avoid unnecessary thrashing,
// Arrow clicks move target for animation,
// And only animate to target after arrow clicks.

let listOffset = 0;
let listVelocity = 0;

let isLeftArrowHidden = false;
let isRightArrowHidden = false;

let targetListOffset = 0;

let isTargeting = false;

let minListOffset =
  -LIST_ITEM_WIDTH * playlistContent.length +
  window.innerWidth -
  2 * LIST_PADDING;
window.addEventListener("resize", () => {
  minListOffset =
    -LIST_ITEM_WIDTH * playlistContent.length +
    window.innerWidth -
    2 * LIST_PADDING;
});

// ARROWS BEHAVIOUR

function handleLeftArrowMousedown(e) {
  e.preventDefault();
  e.stopPropagation();
  targetListOffset = Math.min(0, targetListOffset + LIST_ITEM_WIDTH);
  isTargeting = true;
}

function handleRightArrowMousedown(e) {
  e.preventDefault();
  e.stopPropagation();
  targetListOffset = Math.max(
    minListOffset,
    targetListOffset - LIST_ITEM_WIDTH
  );
  isTargeting = true;
}

leftArrow.addEventListener("mousedown", handleLeftArrowMousedown);
leftArrow.addEventListener("touchstart", handleLeftArrowMousedown);
rightArrow.addEventListener("mousedown", handleRightArrowMousedown);
rightArrow.addEventListener("touchstart", handleRightArrowMousedown);

// DRAGGING

function handleListMousedown(e) {
  isDragging = true;
  listVelocity = 0;
  lastMouseX = e.touches ? e.touches[0].clientX : e.clientX;
  isTargeting = false;
  amountDragged = 0;
  hasDragged = false;
}

function handleListMousemove(e) {
  if (isDragging) {
    const d = (e.touches ? e.touches[0].clientX : e.clientX) - lastMouseX;
    amountDragged += d;
    if (amountDragged > MIN_DRAG || amountDragged < -MIN_DRAG) {
      hasDragged = true;
    }
    listVelocity = d;
    listOffset = Math.min(0, Math.max(minListOffset, listOffset + d));
    lastMouseX = e.touches ? e.touches[0].clientX : e.clientX;
  }
}

function handleListMouseup() {
  isDragging = false;
}

listCont.addEventListener("mousedown", handleListMousedown);
listCont.addEventListener("touchstart", handleListMousedown);
listCont.addEventListener("mousemove", handleListMousemove);
listCont.addEventListener("touchmove", handleListMousemove);
listCont.addEventListener("mouseup", handleListMouseup);
listCont.addEventListener("touchend", handleListMouseup);
listCont.addEventListener("mouseleave", handleListMouseup);
listCont.addEventListener("touchcancel", handleListMouseup);

// AUTOPLAY

video.addEventListener("ended", () => {
  const nextIndex = (currentIndex + 1) % playlistContent.length;
  listItems[currentIndex].classList.remove("active");
  listItems[nextIndex].classList.add("active");
  video.src = playlistContent[nextIndex].video_url;
  videoTrack.src = `data:text/vtt;${playlistContent[nextIndex].subtitles}`;
  saveLabel(playlistContent[nextIndex].id);
  currentIndex = nextIndex;

  targetListOffset = Math.min(
    0,
    Math.max(minListOffset, -(nextIndex - 1) * LIST_ITEM_WIDTH)
  );
  isTargeting = true;
});

let t0 = null;

// 60fps MAIN LOOP
// Updates everything that needs regular updating:
// - list offset & velocity
// - current list target
// - arrows' hidden state & CSS class
// - video progress bar
// - etc.

function update(t1) {
  // Framerate independence:
  // time since last frame started, dt = t1 - t0.
  // offset [px] += offset [px] + velocity [px/frame] * dt [ms/frame] / ideal dt [ms/frame],
  // where 1 / ideal dt [ms/frame] = 1 / 16 [ms/frame] = 0.0625 [frames/ms]

  const dt = t1 - t0;
  t0 = t1;
  if (listVelocity > MIN_LIST_VELOCITY || listVelocity < -MIN_LIST_VELOCITY) {
    listVelocity *= FRICTION;
    listOffset = Math.min(
      0,
      Math.max(minListOffset, listOffset + listVelocity * dt * 0.0625)
    );
    list.style.transform = `translateX(${listOffset}px)`;

    // Set current target for when arrows are eventually clicked
    if (!isTargeting) {
      targetListOffset =
        Math.round(listOffset / LIST_ITEM_WIDTH) * LIST_ITEM_WIDTH;
    }
  }

  // Cached arrow state to avoid unnecessary thrashing
  if (!isLeftArrowHidden) {
    if (targetListOffset === 0) {
      leftArrow.classList.add("hidden_arrow");
      isLeftArrowHidden = true;
    }
  }
  if (isLeftArrowHidden) {
    if (targetListOffset !== 0) {
      leftArrow.classList.remove("hidden_arrow");
      isLeftArrowHidden = false;
    }
  }
  if (!isRightArrowHidden) {
    if (listOffset === minListOffset || targetListOffset === minListOffset) {
      rightArrow.classList.add("hidden_arrow");
      isRightArrowHidden = true;
    }
  }
  if (isRightArrowHidden) {
    if (listOffset !== minListOffset && targetListOffset !== minListOffset) {
      rightArrow.classList.remove("hidden_arrow");
      isRightArrowHidden = false;
    }
  }

  // Only animate to target after arrow clicks
  if (isTargeting) {
    const targetD = targetListOffset - listOffset;
    if (targetD > MIN_TARGET_D || targetD < -MIN_TARGET_D) {
      listVelocity = 0.1 * targetD;
    }
  }

  // Progress bar
  const { duration } = video;
  videoProgress.style.transform = `scaleX(${
    duration ? video.currentTime / duration : 0
  })`;

  requestAnimationFrame(update);
}

// Init

saveLabel(playlistContent[currentIndex].id);

listItems[currentIndex].classList.add("active");

video.src = playlistContent[0].video_url;
videoTrack.src = playlistContent[0].subtitles;

leftArrow.classList.add("hidden_arrow");
isLeftArrowHidden = true;

update();

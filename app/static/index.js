/*
// DEBUG
const debug_el = document.createElement('div')
debug_el.style.position = 'fixed'
debug_el.style.top = '0'
debug_el.style.right = '0'
debug_el.style.background = '#fff'
debug_el.style.zIndex = 1
document.body.appendChild(debug_el)

window.addEventListener('error', function (e) {
  debug_el.innerHTML += e.message +'. l'+ e.lineno +':c'+ e.colno
})
*/

function save_label(label_id) {
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
      label_id
    })
  });
}

// CONSTANTS

const LIST_ITEM_WIDTH = 400;
const ACTIVE_LIST_ITEM_WIDTH = 640;
const LIST_PADDING = 220;
const FRICTION = 0.9;
const MIN_LIST_VELOCITY = 0.02;
const MIN_TARGET_D = 0.02;
const MIN_DRAG = 10;
const COLLECT_TEXT = "TAP LENS ON READER";

// CONTENT

const playlist_content = window.playlist_labels.map(function r(x) {
  return {
    id: x.label.id,
    title: x.label.title,
    secondary_title: x.label.subtitles,
    content0: x.label.columns[0].content,
    content1: x.label.columns[1].content,
    content2: x.label.columns[2].content,
    style0: x.label.columns[0].style,
    style1: x.label.columns[1].style,
    style2: x.label.columns[2].style,
    video_url: x.resource,
    image_url: x.image,
    subtitles: x.subtitles
      ? URL.createObjectURL(
          new Blob([x.subtitles], { type: "text/vtt; charset=UTF-8" })
        )
      : ""
  };
});

// GLOBAL VARS

let window_inner_width = window.innerWidth;

let min_list_offset = 0;
let list_offset = 0;
let list_velocity = 0;
let target_list_offset = 0;

let is_targeting = false;
let is_mouse_down = false;
let last_mouse_x = 0;
let mouse_x = 0;
let has_dragged = false;
let amount_dragged = 0;

const list_items = [];
const collect_elements = [];
let current_index = 0;

let is_animating_collect = false;

let video_duration = 0;

let error_dialogue_close_timeout = null;

// DOM

const root = document.getElementById("root");

const video = document.createElement("video");
root.appendChild(video);
video.className = "video";
video.autoplay = true;
video.src = playlist_content[0].video_url;

const video_track = document.createElement("track");
video.appendChild(video_track);
video_track.default = true;
video_track.src = playlist_content[0].subtitles;

const video_progress = document.createElement("div");
root.appendChild(video_progress);
video_progress.className = "video_progress";

const list_cont = document.createElement("div");
root.appendChild(list_cont);
list_cont.className = "list_cont";

const list = document.createElement("div");
list_cont.appendChild(list);
list.className = "list";

for (let i = 0; i < playlist_content.length; i++) {
  const item_data = playlist_content[i];

  const item = document.createElement("div");
  list_items.push(item);
  list.appendChild(item);
  item.className = "list_item";
  item.style.backgroundImage = `url(${item_data.image_url})`;

  const item_inner = document.createElement("div");
  item_inner.className = "list_item_inner";
  item.appendChild(item_inner);

  const title = document.createElement("div");
  item_inner.appendChild(title);
  title.className = "list_item_title";
  title.innerHTML = item_data.title;

  const secondary_title = document.createElement("div");
  item_inner.appendChild(secondary_title);
  secondary_title.className = "list_item_secondary_title";
  secondary_title.innerHTML = item_data.secondary_title;

  const description = document.createElement("div");
  item_inner.appendChild(description);
  description.className = "list_item_description";

  const content0 = document.createElement("div");
  content0.className = item_data.style0 === "smaller" ? "content_smaller" : "";
  description.appendChild(content0);
  content0.innerHTML = item_data.content0;

  const content1 = document.createElement("div");
  content1.className = item_data.style1 === "smaller" ? "content_smaller" : "";
  description.appendChild(content1);
  content1.innerHTML = item_data.content1;

  const content2 = document.createElement("div");
  content2.className = item_data.style2 === "smaller" ? "content_smaller" : "";
  description.appendChild(content2);
  content2.innerHTML = item_data.content2;

  const collect = document.createElement("div");
  item_inner.appendChild(collect);
  collect.className = "list_item_collect";
  collect.innerHTML = COLLECT_TEXT;
  collect_elements.push(collect);

  item.addEventListener("click", function handle_item_click(e) {
    if (has_dragged) {
      e.preventDefault();
    } else if (list_items[current_index] !== item) {
      list_items[current_index].classList.remove("active");
      item.classList.add("active");
      video.style.transition = "none";
      video.style.opacity = 0;
      video.src = playlist_content[i].video_url;
      video_track.src = playlist_content[i].subtitles;
      save_label(playlist_content[i].id);
      current_index = i;

      target_list_offset = Math.min(
        0,
        Math.max(
          min_list_offset,
          -LIST_ITEM_WIDTH * current_index -
            LIST_PADDING +
            window_inner_width * 0.5 -
            ACTIVE_LIST_ITEM_WIDTH * 0.5
        )
      );

      is_targeting = true;
    }
  });
}
video.addEventListener("play", function handle_play() {
  video.style.transition = "opacity 500ms";
  video.style.opacity = 1;
});

const scrollbar_el = document.createElement("div");
document.body.appendChild(scrollbar_el);
scrollbar_el.className = "scrollbar";

const tap_error_element = document.createElement("div");
tap_error_element.id = "error_dialogue";
tap_error_element.className = "error_dialogue closed";
document.body.appendChild(tap_error_element);

const tap_error_text_element = document.createElement("div");
tap_error_text_element.id = "error_dialogue_text";
tap_error_text_element.className = "error_dialogue_text";
tap_error_element.appendChild(tap_error_text_element);

const tap_error_close_element = document.createElement("div");
tap_error_close_element.className = "error_dialogue_close";
tap_error_element.appendChild(tap_error_close_element);

// EVENT HANDLERS

function handle_window_resize() {
  window_inner_width = window.innerWidth;
  min_list_offset =
    -LIST_ITEM_WIDTH * (playlist_content.length + 1) +
    window.innerWidth -
    2 * LIST_PADDING;
}

function handle_list_mousedown(e) {
  is_mouse_down = true;
  list_velocity = 0;
  mouse_x = e.touches ? e.touches[0].screenX : e.screenX;
  last_mouse_x = mouse_x;
  is_targeting = false;
  amount_dragged = 0;
  has_dragged = false;
}

function handle_list_mousemove(e) {
  if (is_mouse_down) {
    mouse_x = e.touches ? e.touches[0].screenX : e.screenX;
  }
  e.preventDefault();
  return false;
}

function handle_list_mouseup() {
  is_mouse_down = false;
}

function handle_video_ended() {
  const next_index = (current_index + 1) % playlist_content.length;
  list_items[current_index].classList.remove("active");
  list_items[next_index].classList.add("active");
  video.src = playlist_content[next_index].video_url;
  video_track.src = playlist_content[next_index].subtitles;
  save_label(playlist_content[next_index].id);
  current_index = next_index;

  target_list_offset = Math.min(
    0,
    Math.max(
      min_list_offset,
      -(next_index + 1) * LIST_ITEM_WIDTH +
        (window_inner_width - 2 * LIST_PADDING) * 0.5
    )
  );
  is_targeting = true;
}

function handle_video_play() {
  video_duration = video.duration;
}

function close_error_dialogue() {
  const error_dialogue_element = document.getElementById("error_dialogue");
  window.clearTimeout(error_dialogue_close_timeout);
  window.removeEventListener("click", close_error_dialogue);
  error_dialogue_element.style.opacity = 0;
  error_dialogue_element.style.pointerEvents = "none";
}

function open_error_dialogue(errorHtml) {
  const error_dialogue_element = document.getElementById("error_dialogue");
  error_dialogue_element.style.opacity = 1;
  error_dialogue_element.style.pointerEvents = "all";
  const error_dialogue_text_element = document.getElementById(
    "error_dialogue_text"
  );
  error_dialogue_text_element.innerHTML = errorHtml;
  window.clearTimeout(error_dialogue_close_timeout);
  error_dialogue_close_timeout = window.setTimeout(close_error_dialogue, 3000);
  window.addEventListener("click", close_error_dialogue);
}

function handle_tap_message(event) {
  const eventData = JSON.parse(event.data);
  const tap_successful =
    eventData.tap_successful && eventData.tap_successful === 1;

  if (!tap_successful) {
    open_error_dialogue(
      "Work not collected <br><br> See a Visitor Experience staff member"
    );
    return;
  }

  if (is_animating_collect) return;

  is_animating_collect = true;
  const active_collect_element = collect_elements[current_index];

  active_collect_element.className = "list_item_collect hidden";
  window.setTimeout(function timeout1() {
    active_collect_element.innerHTML = "COLLECTED";
    active_collect_element.className = "list_item_collect active";
  }, 500);
  window.setTimeout(function timeout2() {
    active_collect_element.className = "list_item_collect active hidden";
  }, 3000);
  window.setTimeout(function timeout3() {
    active_collect_element.className = "list_item_collect";
    active_collect_element.innerHTML = COLLECT_TEXT;
    is_animating_collect = false;
  }, 3500);
}

list_cont.addEventListener("mousedown", handle_list_mousedown);
list_cont.addEventListener("touchstart", handle_list_mousedown, {
  passive: false
});
list_cont.addEventListener("mousemove", handle_list_mousemove);
list_cont.addEventListener("touchmove", handle_list_mousemove, {
  passive: false
});
list_cont.addEventListener("mouseup", handle_list_mouseup);
list_cont.addEventListener("touchend", handle_list_mouseup);
list_cont.addEventListener("mouseleave", handle_list_mouseup);
list_cont.addEventListener("touchcancel", handle_list_mouseup);
window.addEventListener("resize", handle_window_resize);
video.addEventListener("ended", handle_video_ended);
video.addEventListener("play", handle_video_play);
const tap_source = new EventSource("/api/tap-source");
tap_source.onmessage = handle_tap_message;

// Updates everything that needs regular updating, at 60fps
function main_loop() {
  // HANDLE DRAGGING
  if (is_mouse_down) {
    const d = mouse_x - last_mouse_x;
    amount_dragged += d;
    // Prevent click event when scrolling
    if (amount_dragged > MIN_DRAG || amount_dragged < -MIN_DRAG) {
      has_dragged = true;
    }
    // Prevent bad touch screens interfering with smooth friction effect
    if (d > MIN_LIST_VELOCITY || d < -MIN_LIST_VELOCITY) {
      list_velocity = d;
    }
    last_mouse_x = mouse_x;
  }

  // UPDATE LIST OFFSET PHYSICS AND UI
  if (list_velocity > MIN_LIST_VELOCITY || list_velocity < -MIN_LIST_VELOCITY) {
    list_offset = Math.min(
      0,
      Math.max(min_list_offset, list_offset + list_velocity)
    );
    list.style.transform = `translateX(${list_offset}px)`;
    list_velocity *= FRICTION;

    if (!is_targeting) {
      target_list_offset =
        Math.round(list_offset / LIST_ITEM_WIDTH) * LIST_ITEM_WIDTH;
    }
  }

  // UPDATE LIST OFFSET WHEN VIDEO CHANGES
  if (is_targeting) {
    const target_d = target_list_offset - list_offset;
    if (target_d > MIN_TARGET_D || target_d < -MIN_TARGET_D) {
      list_velocity = 0.1 * target_d;
    }
  }

  // UPDATE VIDEO PROGRESS BAR
  video_progress.style.transform = `scaleX(${
    video_duration ? video.currentTime / video_duration : 0
  })`;

  // UPDATE SCROLLBAR
  scrollbar_el.style.left = `${((window.innerWidth - 60) * list_offset) /
    (min_list_offset || 1)}px`;

  requestAnimationFrame(main_loop);
}

// INIT
handle_window_resize();
save_label(playlist_content[current_index].id);
list_items[current_index].classList.add("active");
main_loop();

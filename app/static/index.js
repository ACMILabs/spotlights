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



function save_label(label_id) {
  fetch('http://localhost:8081/api/labels/', {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      redirect: 'follow',
      referrer: 'no-referrer',
      body: JSON.stringify({
        datetime: Date.now(),
        label_id: label_id,
      }),
  })
}

const LIST_ITEM_WIDTH = 400
const LIST_PADDING = 220

const FRICTION = 0.9
const MIN_LIST_VELOCITY = 0.02
const MIN_TARGET_D = 0.02
const MIN_DRAG = 10


const playlist_content = window.playlist_labels.map(function (x) {
  return {
    id: x.label.id,
    title: x.label.title,
    secondary_title: x.label.title,
    description: x.label.description,
    video_url: x.resource,
    image_url: x.image,
    subtitles: 'data:text/vtt;base64,'+btoa(x.subtitles),
  }
})


// Width dependent variables

let min_list_offset = 0
let window_inner_width = window.innerWidth

function handle_window_resize () {
  window_inner_width = window.innerWidth
  min_list_offset = -LIST_ITEM_WIDTH * (playlist_content.length + 1) + window.innerWidth - 2 * LIST_PADDING
}

handle_window_resize()
window.addEventListener('resize', handle_window_resize)


// DOM

const root = document.getElementById('root')

const video = document.createElement('video')
video.className = 'video'
video.autoplay = true
root.appendChild(video)


const video_track = document.createElement('track')
video.appendChild(video_track)
video_track.default = true

const video_progress = document.createElement('div')
root.appendChild(video_progress)
video_progress.className = 'video_progress'

const list_cont = document.createElement('div')
root.appendChild(list_cont)
list_cont.className = 'list_cont'

const list = document.createElement('div')
list_cont.appendChild(list)
list.className = 'list'

const list_items = []
let active_collect_element = null
const collect_elements = []
let current_index = 0

// Build playlist DOM elements

for (let i=0; i<playlist_content.length; i++) {
  const item_data = playlist_content[i]

  const item = document.createElement('div')
  list_items.push(item)
  list.appendChild(item)
  item.className = 'list_item'
  item.style.backgroundImage = 'url('+item_data.image_url+')'

  const item_inner = document.createElement('div')
  item_inner.className = 'list_item_inner'
  item.appendChild(item_inner)

  const title = document.createElement('div')
  item_inner.appendChild(title)
  title.className = 'list_item_title'
  title.innerHTML = item_data.title

  const secondary_title = document.createElement('div')
  item_inner.appendChild(secondary_title)
  secondary_title.className = 'list_item_secondary_title'
  secondary_title.innerHTML = item_data.secondary_title

  const description = document.createElement('div')
  item_inner.appendChild(description)
  description.className = 'list_item_description'
  description.innerHTML = item_data.description

  const collect = document.createElement('div')
  item_inner.appendChild(collect)
  collect.className = 'list_item_collect'
  collect.innerHTML = 'COLLECT'
  collect_elements.push(collect)

  item.addEventListener('click', function (e) {
    if (has_dragged) {
      e.preventDefault()
    }
    else if (list_items[current_index] != item) {
      list_items[current_index].classList.remove('active')
      item.classList.add('active')
      video.src = playlist_content[i].video_url
      video_track.src = 'data:text/vtt;'+playlist_content[i].subtitles
      save_label(playlist_content[i].id)
      current_index = i

      target_list_offset = Math.min(0, Math.max(min_list_offset, -(current_index + 1) * LIST_ITEM_WIDTH + (window_inner_width - 2 * LIST_PADDING) * 0.5))
      is_targeting = true
    }
  })
}



// Dragging, animation, physics variables.

let list_offset = 0
let list_velocity = 0
let target_list_offset = 0
let is_targeting = false



// DRAGGING

let is_mouse_down = false
let last_mouse_x = 0
let mouse_x = 0
let has_dragged = false
let amount_dragged = 0

function handle_list_mousedown (e) {
  is_mouse_down = true
  list_velocity = 0
  mouse_x = e.touches ? e.touches[0].screenX : e.screenX
  last_mouse_x = mouse_x
  is_targeting = false
  amount_dragged = 0
  has_dragged = false
}
function handle_list_mousemove (e) {
  if (is_mouse_down) {
    mouse_x = e.touches ? e.touches[0].screenX : e.screenX
  }
  e.preventDefault()
  return false
}

function handle_list_mouseup () {
  is_mouse_down = false
}

list_cont.addEventListener('mousedown', handle_list_mousedown)
list_cont.addEventListener('touchstart', handle_list_mousedown, {passive: false})
list_cont.addEventListener('mousemove', handle_list_mousemove)
list_cont.addEventListener('touchmove', handle_list_mousemove, {passive: false})
list_cont.addEventListener('mouseup', handle_list_mouseup)
list_cont.addEventListener('touchend', handle_list_mouseup)
list_cont.addEventListener('mouseleave', handle_list_mouseup)
list_cont.addEventListener('touchcancel', handle_list_mouseup)



// AUTOPLAY

video.addEventListener('ended', function () {
  const next_index = (current_index + 1) % playlist_content.length
  list_items[current_index].classList.remove('active')
  list_items[next_index].classList.add('active')
  video.src = playlist_content[next_index].video_url
  video_track.src = 'data:text/vtt;'+playlist_content[next_index].subtitles
  save_label(playlist_content[next_index].id)
  current_index = next_index

  target_list_offset = Math.min(0, Math.max(min_list_offset, -(next_index + 1) * LIST_ITEM_WIDTH + (window_inner_width - 2 * LIST_PADDING) * 0.5))
  is_targeting = true
})
video.addEventListener('play', function () {
  video_duration = video.duration
})


const tap_source = new EventSource("/api/tap-source");
let has_tapped = false
let video_duration = 0


tap_source.onmessage = function(e) {
  has_tapped = true
}

// 60fps MAIN LOOP
// Updates everything that needs regular updating:
// - list offset & velocity
// - current list target
// - video progress bar
// - etc.

function update () {
  if (is_mouse_down) {
    const d = mouse_x - last_mouse_x
    amount_dragged += d
    if (amount_dragged > MIN_DRAG || amount_dragged < -MIN_DRAG) {
      has_dragged = true
    }
    if (d > MIN_LIST_VELOCITY || d < -MIN_LIST_VELOCITY) {
      list_velocity = d
    }
    last_mouse_x = mouse_x
    debug_el.innerHTML = list_velocity
  }

  if (list_velocity > MIN_LIST_VELOCITY || list_velocity < -MIN_LIST_VELOCITY) {
    list_offset = Math.min(0, Math.max(min_list_offset, list_offset + list_velocity))
    list.style.transform = 'translateX('+list_offset+'px)'
    list_velocity *= FRICTION

    if (!is_targeting) {
      target_list_offset = Math.round(list_offset / LIST_ITEM_WIDTH) * LIST_ITEM_WIDTH
    }
  }


  // Only animate to target after videos change
  if (is_targeting) {
    const target_d = target_list_offset - list_offset
    if (target_d > MIN_TARGET_D || target_d < -MIN_TARGET_D) {
      list_velocity = 0.1 * target_d
    }
  }


  // Progress bar
  video_progress.style.transform = 'scaleX('+(video_duration ? (video.currentTime / video_duration) : 0)+')'


  if (has_tapped) {
    has_tapped = false
    active_collect_element = collect_elements[current_index]
    active_collect_element.className = 'list_item_collect hidden'
    window.setTimeout(function () {
      active_collect_element.innerHTML = 'COLLECTED'
      active_collect_element.className = 'list_item_collect active'
    }, 1000)
    window.setTimeout(function () {
      active_collect_element.className = 'list_item_collect active hidden'
    }, 3000)
    window.setTimeout(function () {
      active_collect_element.className = 'list_item_collect'
      active_collect_element.innerHTML = 'COLLECT'
    }, 4000)
  }

  requestAnimationFrame(update)
}



// Init

save_label(playlist_content[current_index].id)

list_items[current_index].classList.add('active')

video.src = playlist_content[0].video_url
video_track.src = playlist_content[0].subtitles

update()

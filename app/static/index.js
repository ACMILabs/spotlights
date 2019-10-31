const debug_el = document.createElement('div')
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



const LIST_ITEM_WIDTH = 240
const LIST_PADDING = 30

const FRICTION = 0.9
const MIN_LIST_VELOCITY = 0.02
const MIN_TARGET_D = 0.02
const MIN_DRAG = 10


const content = window.playlist_labels.map(function (x) {
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



// DOM

const root = document.getElementById('root')

const video = document.createElement('video')
video.className = 'video'
video.autoplay = true
video.setAttribute('muted', true)
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
let current_index = 0

for (let i=0; i<content.length; i++) {
  const p = content[i]

  const item = document.createElement('div')
  list_items.push(item)
  list.appendChild(item)
  item.className = 'list_item'
  item.style.backgroundImage = 'url('+p.image_url+')'

  const title = document.createElement('div')
  item.appendChild(title)
  title.className = 'list_item_title'
  title.innerHTML = p.title

  const secondary_title = document.createElement('div')
  item.appendChild(secondary_title)
  secondary_title.className = 'list_item_secondary_title'
  secondary_title.innerHTML = p.secondary_title

  const description = document.createElement('div')
  item.appendChild(description)
  description.className = 'list_item_description'
  description.innerHTML = p.description

  item.addEventListener('click', function (e) {
    if (has_dragged) {
      e.preventDefault()
    }
    else if (list_items[current_index] != item) {
      list_items[current_index].classList.remove('active')
      item.classList.add('active')
      video.src = content[i].video_url
      video_track.src = 'data:text/vtt;'+content[i].subtitles
      save_label(content[i].id)
      current_index = i
    }
  })
}

const left_arrow = document.createElement('div')
list_cont.appendChild(left_arrow)
left_arrow.className = 'left_arrow'

const right_arrow = document.createElement('div')
list_cont.appendChild(right_arrow)
right_arrow.className = 'right_arrow'



// Physics,
// Cache to avoid unnecessary thrashing,
// Arrow clicks move target for animation,
// And only animate to target after arrow clicks.

let list_offset = 0
let list_velocity = 0

let is_left_arrow_hidden = false
let is_right_arrow_hidden = false

let target_list_offset = 0

let is_targeting = false

let min_list_offset = -LIST_ITEM_WIDTH * content.length + window.innerWidth - 2*LIST_PADDING
window.addEventListener('resize', function () {
  min_list_offset = -LIST_ITEM_WIDTH * content.length + window.innerWidth - 2*LIST_PADDING
})



// ARROWS

function handle_left_arrow_mousedown (e) {
  e.preventDefault()
  e.stopPropagation()
  target_list_offset = Math.min(0, target_list_offset + LIST_ITEM_WIDTH)
  is_targeting = true
}

function handle_right_arrow_mousedown (e) {
  e.preventDefault()
  e.stopPropagation()
  target_list_offset = Math.max(min_list_offset, target_list_offset - LIST_ITEM_WIDTH)
  is_targeting = true
}

left_arrow.addEventListener('mousedown', handle_left_arrow_mousedown)
left_arrow.addEventListener('touchstart', handle_left_arrow_mousedown)
right_arrow.addEventListener('mousedown', handle_right_arrow_mousedown)
right_arrow.addEventListener('touchstart', handle_right_arrow_mousedown)



// DRAGGING

let is_dragging = false
let last_mouse_x = 0
let has_dragged = false
let amount_dragged = 0

function handle_list_mousedown (e) {
  is_dragging = true
  list_velocity = 0
  last_mouse_x = e.touches ? e.touches[0].clientX : e.clientX
  is_targeting = false
  amount_dragged = 0
  has_dragged = false
}

function handle_list_mousemove (e) {
  if (is_dragging) {
    const d = (e.touches ? e.touches[0].clientX : e.clientX) - last_mouse_x
    amount_dragged += d
    if (amount_dragged > MIN_DRAG || amount_dragged < -MIN_DRAG) {
      has_dragged = true
    }
    list_velocity = d
    list_offset = Math.min(0, Math.max(min_list_offset, list_offset + d))
    last_mouse_x = e.touches ? e.touches[0].clientX : e.clientX
  }
}

function handle_list_mouseup () {
  is_dragging = false
}

list_cont.addEventListener('mousedown', handle_list_mousedown)
list_cont.addEventListener('touchstart', handle_list_mousedown)
list_cont.addEventListener('mousemove', handle_list_mousemove)
list_cont.addEventListener('touchmove', handle_list_mousemove)
list_cont.addEventListener('mouseup', handle_list_mouseup)
list_cont.addEventListener('touchend', handle_list_mouseup)
list_cont.addEventListener('mouseleave', handle_list_mouseup)
list_cont.addEventListener('touchcancel', handle_list_mouseup)



// AUTOPLAY

video.addEventListener('ended', function () {
  const next_index = (current_index + 1) % content.length
  list_items[current_index].classList.remove('active')
  list_items[next_index].classList.add('active')
  video.src = content[next_index].video_url
  video_track.src = 'data:text/vtt;'+content[next_index].subtitles
  save_label(content[next_index].id)
  current_index = next_index

  target_list_offset = Math.min(0, Math.max(min_list_offset, -(next_index - 1) * LIST_ITEM_WIDTH))
  is_targeting = true
})


let t0 = null

// MAIN LOOP
function update (t1) {

  // Framerate independent sim: dt = t1 - t0. 
  // offset [px] += offset [px] + velocity [px/frame] * dt [ms/frame] / ideal dt [ms/frame]
  // 1 / ideal dt [ms/frame] = 1 / 16 [ms/frame] = 0.0625 [frames/ms]

  const dt = t1 - t0
  t0 = t1
  if (list_velocity > MIN_LIST_VELOCITY || list_velocity < -MIN_LIST_VELOCITY) {
    list_velocity *= FRICTION
    list_offset = Math.min(0, Math.max(min_list_offset, list_offset + list_velocity*dt*0.0625))
    list.style.transform = 'translateX('+list_offset+'px)'

    // Set current target for when arrows are eventually clicked
    if (!is_targeting) {
      target_list_offset = Math.round(list_offset / LIST_ITEM_WIDTH) * LIST_ITEM_WIDTH
    }
  }


  // Cached arrow state to avoid unnecessary thrashing
  if (!is_left_arrow_hidden) {
    if (target_list_offset == 0) {
      left_arrow.classList.add('hidden_arrow')
      is_left_arrow_hidden = true
    }
  }
  if (is_left_arrow_hidden) {
    if (target_list_offset != 0) {
      left_arrow.classList.remove('hidden_arrow')
      is_left_arrow_hidden = false
    }
  }
  if (!is_right_arrow_hidden) {
    if (list_offset == min_list_offset || target_list_offset == min_list_offset) {
      right_arrow.classList.add('hidden_arrow')
      is_right_arrow_hidden = true
    }
  }
  if (is_right_arrow_hidden) {
    if (list_offset != min_list_offset && target_list_offset != min_list_offset) {
      right_arrow.classList.remove('hidden_arrow')
      is_right_arrow_hidden = false
    }
  }


  // Only animate to target after arrow clicks
  if (is_targeting) {
    const target_d = target_list_offset - list_offset
    if (target_d > MIN_TARGET_D || target_d < -MIN_TARGET_D) {
      list_velocity = 0.1 * target_d
    }
  }


  // Progress bar
  const duration = video.duration
  video_progress.style.transform = 'scaleX('+(duration ? (video.currentTime / duration) : 0)+')'


  requestAnimationFrame(update)
}



// Init

save_label(content[current_index].id)

list_items[current_index].classList.add('active')

video.src = content[0].video_url
video_track.src = content[0].subtitles

left_arrow.classList.add('hidden_arrow')
is_left_arrow_hidden = true

update()

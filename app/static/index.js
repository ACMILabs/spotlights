function save_label(label_id, playlist_id) {
  fetch('http://localhost:8080/api/labels/', {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      redirect: 'follow',
      referrer: 'no-referrer',
      body: JSON.stringify({
        datetime: Date.now(),
        playlist_id: playlist_id,
        label_id: label_id,
      }),
  })
  .then(response => response.json())
  .then(data => console.log(JSON.stringify(data)))
  .catch(error => console.error(error));
}

const LIST_ITEM_WIDTH = 240
const LIST_PADDING = 30

const playlist = [
  {
    id: 0,
    title: "George Miller",
    secondary_title: "Filmmaker",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },

  {
    id: 1,
    title: "Gillian Armstrong",
    secondary_title: "Director",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },

  {
    id: 2,
    title: "Placeholder video 2",
    secondary_title: "Filmmaker",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },

  {
    id: 3,
    title: "Placeholder video 3",
    secondary_title: "Director",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },

  {
    id: 4,
    title: "Placeholder video 4",
    secondary_title: "Filmmaker",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },

  {
    id: 5,
    title: "Placeholder video 5",
    secondary_title: "Director",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },

  {
    id: 6,
    title: "Placeholder video 6",
    secondary_title: "Filmmaker",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },

  {
    id: 7,
    title: "Placeholder video 7",
    secondary_title: "Director",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },

  {
    id: 8,
    title: "Placeholder video 8",
    secondary_title: "Filmmaker",
    description: "This is the first placeholder video for the ACMI media players. On initial startup an unconfigured media player will play a playlist containing this video.",
    video_url: "/static/sample.mp4",
    image_url: "/static/sample.png",
  },
]

const root = document.getElementById('root')

const video = document.createElement('video')
root.appendChild(video)
video.className = 'video'
video.loop = true
video.autoplay = true
video.muted = true

const list_cont = document.createElement('div')
root.appendChild(list_cont)
list_cont.className = 'list_cont'

const list = document.createElement('div')
list_cont.appendChild(list)
list.className = 'list'

const list_items = []
let current_item = null

for (let i=0; i<playlist.length; i++) {
  const p = playlist[i]

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

  item.addEventListener('click', function () {
    if (current_item != item) {
      current_item.classList.remove('active')
      item.classList.add('active')
      video.src = playlist[i].video_url
      current_item = item
      save_label(playlist[i].id, playlist_id)
    }
  })
}


let list_offset = 0
let is_left_arrow_hidden = false
let is_right_arrow_hidden = false

const left_arrow = document.createElement('div')
list_cont.appendChild(left_arrow)
left_arrow.className = 'left_arrow'
left_arrow.addEventListener('click', function () {
  const min = -LIST_ITEM_WIDTH * playlist.length + window.innerWidth - 2*LIST_PADDING
  list_offset = Math.min(0, Math.max(min, list_offset + LIST_ITEM_WIDTH))
  if (!is_left_arrow_hidden) {
    if (list_offset == 0) {
      left_arrow.classList.add('hidden_arrow')
      is_left_arrow_hidden = true
    }
  }
  if (is_right_arrow_hidden) {
    if (list_offset != min) {
      right_arrow.classList.remove('hidden_arrow')
      is_right_arrow_hidden = false
    }
  }

  list.style.transform = 'translateX('+list_offset+'px)'
})

const right_arrow = document.createElement('div')
list_cont.appendChild(right_arrow)
right_arrow.className = 'right_arrow'
right_arrow.addEventListener('click', function () {
  const min = -LIST_ITEM_WIDTH * playlist.length + window.innerWidth - 2*LIST_PADDING
  list_offset = Math.min(0, Math.max(min, list_offset - LIST_ITEM_WIDTH))
  if (!is_right_arrow_hidden) {
    if (list_offset == min) {
      right_arrow.classList.add('hidden_arrow')
      is_right_arrow_hidden = true
    }
  }
  if (is_left_arrow_hidden) {
    if (list_offset != 0) {
      left_arrow.classList.remove('hidden_arrow')
      is_left_arrow_hidden = false
    }
  }

  list.style.transform = 'translateX('+list_offset+'px)'
})



// Init
current_item = list_items[0]
current_item.classList.add('active')

video.src = playlist[0].video_url

left_arrow.classList.add('hidden_arrow')
is_left_arrow_hidden = true

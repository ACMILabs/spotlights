// This fuzzer test runs most of the code in index.js
describe("App", () => {
  it("shouldn't crash from fuzzer", () => {
    global.playlist_labels = (require('../../data/playlist.json')).playlist_labels
    document.body.innerHTML = "<div id='root'/>"

    require("../../../app/static/index.js")

    const elements = document.getElementsByTagName('div')

    for (let i=0; i<elements.length; i++) {
      elements[i].dispatchEvent(new MouseEvent('click'))
    }
    for (let i=0; i<elements.length; i++) {
      elements[i].dispatchEvent(new MouseEvent('mousedown', {clientX: 0}))
      elements[i].dispatchEvent(new MouseEvent('mousemove', {clientX: -100}))
      elements[i].dispatchEvent(new MouseEvent('mouseup'))
      elements[i].dispatchEvent(new MouseEvent('click'))
    }

    const list_cont = document.getElementsByClassName('list_cont')[0]
    list_cont.dispatchEvent(new MouseEvent('mousedown', {clientX: 0}))
    list_cont.dispatchEvent(new MouseEvent('mousemove', {clientX: 0}))
    list_cont.dispatchEvent(new MouseEvent('mousemove', {clientX: -100}))
    list_cont.dispatchEvent(new MouseEvent('mouseup'))


    const right_arrow = document.getElementsByClassName('right_arrow')[0]
    for (let i=0; i<6; i++) {
      setTimeout(right_arrow.dispatchEvent(new MouseEvent('mousedown')))
    }
    const left_arrow = document.getElementsByClassName('left_arrow')[0]
    for (let i=0; i<6; i++) {
      setTimeout(left_arrow.dispatchEvent(new MouseEvent('mousedown')))
    }

    window.dispatchEvent(new Event('error'))
    window.dispatchEvent(new Event('resize'))
    document.getElementsByTagName('video')[0].dispatchEvent(new Event('ended'))
  })
})

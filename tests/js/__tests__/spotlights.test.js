window.URL.createObjectURL = function createObjectURL() {};

global.EventSource = function dummyEventSource() {};
global.playlist_labels = require("../../data/playlist.json").playlist_labels;

document.body.innerHTML = "<div id='root'/>";
require("../../../app/static/index");

describe("App", () => {
  beforeAll(() => {});

  it("doesn't crash from clicking any divs", () => {
    const elements = document.getElementsByTagName("div");
    for (let i = 0; i < elements.length; i++) {
      elements[i].dispatchEvent(new MouseEvent("click"));
    }
  });

  it("doesn't crash from dragging any divs", () => {
    const elements = document.getElementsByTagName("div");
    for (let i = 0; i < elements.length; i++) {
      elements[i].dispatchEvent(new MouseEvent("mousedown", { clientX: 0 }));
      elements[i].dispatchEvent(new MouseEvent("mousemove", { clientX: -100 }));
      elements[i].dispatchEvent(new MouseEvent("mouseup"));
      elements[i].dispatchEvent(new MouseEvent("click"));
    }
  });

  it("doesn't crash from dragging the video list", () => {
    const list_cont = document.getElementsByClassName("list_cont")[0];
    list_cont.dispatchEvent(new MouseEvent("mousedown", { clientX: 0 }));
    list_cont.dispatchEvent(new MouseEvent("mousemove", { clientX: 0 }));
    list_cont.dispatchEvent(new MouseEvent("mousemove", { clientX: -100 }));
    list_cont.dispatchEvent(new MouseEvent("mouseup"));
  });

  it("doesn't crash on resize", () => {
    window.dispatchEvent(new Event("resize"));
  });

  it("automatically plays next video", () => {
    const video = document.getElementsByTagName("video")[0];
    const initial_video_src = video.src;
    video.dispatchEvent(new Event("ended"));
    expect(video.src).not.toBe(initial_video_src);
  });

  it("displays expected tap to collect text", () => {
    const collectElement = document.getElementsByClassName(
      "list_item_collect"
    )[0];
    expect(collectElement.innerHTML).toBe("TAP LENS ON READER");
  });
});

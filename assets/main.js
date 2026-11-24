/* 자막핏 홍보 사이트 스크립트: 좁은 화면 메뉴 여닫기(옛 site.js와 같음) · 기능 탭.
   스크립트가 없으면 메뉴는 둘째 줄에 펼쳐지고, 기능 묶음은 차례로 모두 보인다. */
(function () {
  var bar = document.querySelector(".bar");
  var nav = document.querySelector(".nav"), toggle = document.querySelector(".nav__toggle");
  if (nav && toggle) {
    var setOpen = function (open) { nav.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open)); };
    toggle.addEventListener("click", function () { setOpen(!nav.classList.contains("is-open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    /* 키보드 초점이 메뉴 밖으로 나가면 닫는다 */
    nav.addEventListener("focusout", function (e) { if (nav.classList.contains("is-open") && !nav.contains(e.relatedTarget)) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); } });
    document.addEventListener("click", function (e) { if (!bar.contains(e.target)) setOpen(false); });
  }

  var demo = document.getElementById("phone-demo");
  if (demo) {
    var steps = Array.from(demo.querySelectorAll("[data-time]"));
    var jumpButtons = Array.from(demo.querySelectorAll("[data-jump]"));
    var caption = document.getElementById("phone-demo-caption");
    var play = document.getElementById("phone-demo-play");
    var time = document.getElementById("phone-demo-time");
    var seek = document.getElementById("phone-demo-seek");
    var duration = Number(seek.max);
    var elapsed = 0;
    var startedAt = 0;
    var playing = false;
    var frame = 0;
    var currentStep = -1;

    function renderDemo() {
      var active = steps.reduce(function (selected, step, index) {
        return elapsed >= Number(step.dataset.time) ? index : selected;
      }, 0);
      var seconds = Math.floor(elapsed);
      if (currentStep !== active) {
        currentStep = active;
        steps.forEach(function (step, index) { step.hidden = index !== active; });
        jumpButtons.forEach(function (button, index) { button.setAttribute("aria-pressed", String(index === active)); });
        caption.hidden = active === 0;
        caption.textContent = active === 2 ? "바다에 저녁빛이 내립니다." : "바다에 저녁빛이 내려요.";
      }
      time.textContent = seconds + " / " + duration + "초";
      seek.value = elapsed.toFixed(1);
      seek.setAttribute("aria-valuetext", seconds + "초, " + jumpButtons[active].textContent);
      play.textContent = playing ? "일시정지" : elapsed === duration ? "다시 재생" : elapsed === 0 ? "예시 재생" : "이어서 재생";
    }
    function pauseDemo() {
      if (playing) elapsed = Math.min(duration, (performance.now() - startedAt) / 1000);
      playing = false;
      cancelAnimationFrame(frame);
      renderDemo();
    }
    function advanceDemo(now) {
      elapsed = Math.max(0, Math.min(duration, (now - startedAt) / 1000));
      playing = elapsed < duration;
      renderDemo();
      if (playing) frame = requestAnimationFrame(advanceDemo);
    }
    function seekDemo(seconds) {
      pauseDemo();
      elapsed = seconds;
      renderDemo();
    }
    play.addEventListener("click", function () {
      if (playing) { pauseDemo(); return; }
      if (elapsed === duration) elapsed = 0;
      playing = true;
      startedAt = performance.now() - elapsed * 1000;
      renderDemo();
      frame = requestAnimationFrame(advanceDemo);
    });
    jumpButtons.forEach(function (button) {
      button.addEventListener("click", function () { seekDemo(Number(button.dataset.jump)); });
    });
    seek.addEventListener("input", function () { seekDemo(Number(seek.value)); });
    document.addEventListener("visibilitychange", function () { if (document.hidden && playing) pauseDemo(); });
    renderDemo();
    demo.querySelector(".phone-demo__controls").hidden = false;
  }

  // 탭(data-tabs): 스크립트가 있을 때만 탭으로 바꾼다. 좌우 화살표·Home·End로 이동
  document.querySelectorAll("[data-tabs]").forEach(function (box) {
    var tabs = [].slice.call(box.querySelectorAll('[role="tab"]'));
    var panelOf = function (t) { return document.getElementById(t.getAttribute("aria-controls")); };
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        panelOf(t).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      var panel = panelOf(t);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", t.id);
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var next = e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] : e.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length]
          : e.key === "Home" ? tabs[0] : e.key === "End" ? tabs[tabs.length - 1] : null;
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
    if (tabs.length) select(tabs[0]);
  });
})();

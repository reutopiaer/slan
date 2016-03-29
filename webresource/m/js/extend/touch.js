﻿(function ($) {
    var touch = {},
    touchTimeout, tapTimeout, swipeTimeout, longTapTimeout,
    longTapDelay = 750,
    gesture

    function swipeDirection(x1, x2, y1, y2) {
        return Math.abs(x1 - x2) >=
      Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
    }

    function longTap() {
        longTapTimeout = null
        if (touch.last) {
            var event = $.Event('longTap')
            event.cancelTouch = cancelAll
            touch.el.trigger(event)
        }
    }

    function cancelLongTap() {
        if (longTapTimeout) clearTimeout(longTapTimeout)
        longTapTimeout = null
    }

    function cancelAll() {
        if (touchTimeout) clearTimeout(touchTimeout)
        if (tapTimeout) clearTimeout(tapTimeout)
        if (swipeTimeout) clearTimeout(swipeTimeout)
        if (longTapTimeout) clearTimeout(longTapTimeout)
        touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
        touch = {}
    }

    function isMouseEventType(e, type) {
        return e.type == 'mouse' + type;
    }

    $(document).ready(function () {
        var now, delta, deltaX = 0, deltaY = 0, firstTouch,
        events = 'ontouchstart' in document ? ['touchstart', 'touchmove', 'touchend', 'touchcancel'] : ['mousedown', 'mousemove', 'mouseup', 'mouseleave'];

        $(document)
      .on(events[0], function (e) {
          deltaX = deltaY = 0;
          firstTouch = e.type == 'mousedown' ? e : e.touches[0]
          if (e.touches && e.touches.length === 1 && touch.x2) {
              // Clear out touch movement data if we have it sticking around
              // This can occur if touchcancel doesn't fire due to preventDefault, etc.
              touch.x2 = undefined
              touch.y2 = undefined
          }

          now = Date.now()
          delta = now - (touch.last || now)
          touch.el = $(e.target)
          touchTimeout && clearTimeout(touchTimeout)
          touch.x1 = firstTouch.pageX
          touch.y1 = firstTouch.pageY
          if (delta > 0 && delta <= 250) touch.isDoubleTap = true
          touch.last = now
          longTapTimeout = setTimeout(longTap, longTapDelay)

      })
      .on(events[1], function (e) {
          if (e.type == 'mousemove' && !('last' in touch)) return
          firstTouch = e.type == 'mousemove' ? e : e.touches[0]
          cancelLongTap()
          touch.x2 = firstTouch.pageX
          touch.y2 = firstTouch.pageY

          deltaX += Math.abs(touch.x1 - touch.x2)
          deltaY += Math.abs(touch.y1 - touch.y2)
      })
      .on(events[2], function (e) {
          cancelLongTap()

          // swipe
          if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
            (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

              swipeTimeout = setTimeout(function () {
                  touch.el.trigger('swipe')
                  touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
                  touch = {}
              }, 0)

              // normal tap
          else if ('last' in touch)

              // don't fire tap when delta position changed by more than 30 pixels,
              // for instance when moving to a point and back to origin
              if (deltaX < 30 && deltaY < 30 && !e.cancelTap && touch.el[0]===e.target) {
                  // delay by one tick so we can cancel the 'tap' event if 'scroll' fires
                  // ('tap' fires before 'scroll')
                  //tapTimeout = setTimeout(function() {

                  // trigger universal 'tap' with the option to cancelTouch()
                  // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
                  

                  var event = $.Event('tap')
                  event.cancelTouch = cancelAll
                  touch.el.trigger(event)

                  // trigger double tap immediately
                  if (touch.isDoubleTap) {
                      if (touch.el) touch.el.trigger('doubleTap')
                      touch = {}
                  }

                      // trigger single tap after 250ms of inactivity
                  else {
                      touchTimeout = setTimeout(function () {
                          touchTimeout = null
                          if (touch.el) touch.el.trigger('singleTap')
                          touch = {}
                      }, 250)
                  }
                  // }, 0)
              } else {
                  touch = {}
              }
          deltaX = deltaY = 0

      })
        // when the browser window loses focus,
        // for example when a modal dialog is shown,
        // cancel all ongoing events
      .on(events[3], cancelAll)

        // scrolling the window indicates intention of the user
        // to scroll, not tap or swipe, so cancel all ongoing events
        $(window).on('scroll', cancelAll)
    })

    ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
      'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function (eventName) {
          $.fn[eventName] = function (callback) { return this.on(eventName, callback) }
      })
})(Zepto);
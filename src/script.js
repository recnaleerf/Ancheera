(function() {
  $(window).on('beforeunload', function() {
    chrome.runtime.sendMessage({refresh: true});
  });
  var tempImageURLS = {};

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    //consoleLog('script.js', JSON.stringify(message));
    if(message.pageLoad) {
      pageLoad(message.pageLoad);
    }
    if(message.pageUpdate) {
      pageUpdate(message.pageUpdate);
    }
    if(message.selectQuest) {
      //consoleLog('script.js', $('.prt-list-contents').length);
      $('.prt-list-contents').each(function(index) {
        tempImageURLS[$(this).find('.txt-quest-title').first().text()] = $(this).find('.img-quest').first().attr('src');
      });
      //consoleLog('script.js', JSON.stringify(tempImageURLS));
      //consoleLog('script.js', $('.prt-list-contents').length);
      //sendResponse('test');
      // $('.prt-list-contents').each(function(index) {
      //   if(message.enterQuest.name === $(this).find('.txt-quest-title').first().text()) {
      //     consoleLog('script.js', $(this).find('.img-quest').first().attr('src'));
      //     consoleLog('script.js',$(this).find('.img-quest').first().clone().wrap('<div/>').parent().html());
      //     sendResponse($(this).find('.img-quest').first().attr('src'));
      //     return;
      //   }
      // });
    }
    if(message.startQuest) {
      if(tempImageURLS[message.startQuest.name] !== undefined) {
        sendResponse(tempImageURLS[message.startQuest.name]);
      } else {
        sendResponse(null);
      }
    }
    if(message.checkRaids) {
      consoleLog('test');
      list = $('#prt-multi-list');
      raids = [];
      list.find('.btn-multi-raid').each(function(index) {
        consoleLog('script.js', index);
        if($(this).find('.ico-enter').length > 0) {
          raids.push({
            id: "" + $(this).data('raid-id'),
            name: $(this).data('chapter-name'),
            imgURL: $(this).find('.img-raid-thumbnail').first().attr('src'),
            host: ($(this).find('.txt-request-name').text() === "You started this raid battle.")
          });
          //$(this).find('txt-request-name').text() === "You started this raid battle."
        }
      });
      var unclaimed = false;
      if($('.btn-unclaimed').length > 0) {
        unclaimed = true;
      }
      var type;
      if($('#tab-multi').hasClass('active')) {
        type = 'normal';
      } else {
        type = 'event';
      }
      messageDevTools({checkRaids: { 
        'raids': raids,
        'unclaimed': unclaimed,
        'type': type
      }});
    }
  });

  var pageLoad = function(url) {
    if(url.indexOf('#guild') !== -1) {
      if($('.prt-assault-guildinfo').length > 0) {
        times = [];
        $('.prt-assault-guildinfo').find('.prt-item-status').each(function(index) {
          var text = $(this).text();
          var hour = parseInt(text.split(':')[0]);
          if(text.indexOf('p.m.') !== -1 && text.indexOf('p.m') < text.length - 5) {
            if(hour !== 12) {
              hour += 12;
            }
          } else if(hour === 12) {
            hour = 0;
          }
          times[index] = hour;
        });
        messageDevTools({assault: {'times': times}});
      }
    } else if(url.indexOf('#mypage') !== -1) {
      if($('.txt-do-remain-on-button').length !== 0) {
        //chrome.runtime.sendMessage({do: {'time': parseInt($('.txt-do-remain-on-button').text())}});
        messageDevTools({defense:{
            'time': parseInt($('.txt-do-remain-on-button').text()),
            'active': false
        }});
        return;
      } else if($('.do-underway').length !== 0) {
        messageDevTools({defense:{
          'time': -1,
          'active': true
        }});
        return;
      } else {
        consoleLog('wtf even');
        messageDevTools({defense:{
          'time': -1,
          'active': false
        }});
      }
    } else if(url.indexOf('#defend_order') !== -1) {
      if($('.txt-remain-time').length !== 0) {
        //alert($('.txt-remain-time').text());
      }
    } else if(url.indexOf('#quest/assist') !== -1) {

          // messageDevTools({raid: {
          //   id: $(this).data('raid-id'),
          //   name: $(this).data('chapter-name'),
          //   imgURL: $(this).find('.img-raid-thumbnail').first().attr('src')
          // }});
    }
  }

  var pageUpdate = function(url) {
    if(url.indexOf('#quest/index') !== -1) {
      if($('.btn-recommend.visible').length !== 0) {
        $('.prt-quest-detail').each(function() {
          if($(this).find('.txt-quest-title').text() === 'Angel Halo') {
            var time = $(this).find('.prt-remain-time');
            if(time.length !== 0) {
              var num = time.first().text();
              if(num.indexOf('hour') !== -1) {
                messageDevTools({angel: {
                  'delta': parseInt(num.substring(10, num.indexOf(' hour'))),
                  'active': false
                }});
              } else if(num.indexOf('minutes') !== -1) {
                messageDevTools({angel: {
                  'delta': 1,
                  'active': false
                }});
              }
            } else {
              messageDevTools({angel: {
                'delta': 1,
                'active': true
              }});
            }
          }
        });
      }
    }
  }

  var messageDevTools = function(message) {
    chrome.runtime.sendMessage({devtools: message});
  }

  var consoleLog = function(sender, message) {
    chrome.runtime.sendMessage({consoleLog:{
      'sender': sender,
      'message': message
    }});
  }

  
})();
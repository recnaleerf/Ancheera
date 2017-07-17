(function() {
  var currTabID  = -1;
  var currURL    = '';
  var pageLoaded = true;

  var CURRENT_VERSION = '1.1.2';
  var BASE_VERSION    = '1.0.1';
  var patchNotes = {
    '1.0.1': {
      'index': 0,
      'notes': ['-Vira and Narumaya themes added',
        '-Supply name + location tooltips added',
        '(thanks lolPseudoSmart for supply locations)',
        '-Primarch misc daily added',
        '-Primarch raid + xeno jp names added']
    },
    '1.1.0': {
      'index': 1,
      'notes': ['-Weapon Series planner added',
        'Try it out in the supply tab!',
        '-Vira and Narumaya themes removed']
    },
    '1.1.1': {
      'index': 2,
      'notes': ['-Primarch daily changed to option',
        '-Small UI tweaks']
    },
    '1.1.2': {
      'index': 3,
      'notes': ['-GW 5* planner added',
        '(sorry it\'s so late D:)',
        '(also sorry no weapon drop tracking orz)',
        '-Tooltips added to repeat last quest',
        'and copy to clipboard buttons']
    }
  };
  var patchNoteList = [
    '1.0.1',
    '1.1.0',
    '1.1.1',
    '1.1.2'
  ];
  var currentVersion = undefined;

  chrome.browserAction.onClicked.addListener(function() {
    chrome.runtime.openOptionsPage();
  });

  Lyria.Storage.GetMultiple(['version'], function(response) {
    currentVersion = response['version'];
    if (!currentVersion) {
      currentVersion = CURRENT_VERSION;
      Lyria.Storage.Set('version', CURRENT_VERSION);
    }
  });

  var generateNote = function(id) {
    if (patchNotes[id]) {
      var note = 'Version ' +id + ':\n';
      for (var i = 0; i < patchNotes[id].notes.length; i++) {
        note += patchNotes[id].notes[i] + '\n';
      }
      return note;
    }
  };

  Lyria.Options.Initialize(function() {
    Lyria.Dailies.Initialize(function() {
      Lyria.Quest.Initialize(function() {
        Lyria.Casino.Initialize(function() {
          Lyria.Time.Initialize(function() {
            Lyria.Supplies.Initialize();
            Lyria.Profile.Initialize();
            Lyria.Buffs.Initialize();
            //Info.Initialize();
          });
        });
      });
    });
  });

  var responseList = {};
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.setOption) {
      Lyria.Options.Set(message.setOption.id, message.setOption.value);
    }
    if (message.getOption) {
      var id = message.getOption;
      sendResponse({
        'id':    id,
        'value': Lyria.Options.Get(id)
      });
    }

    if (message.consoleLog) {
      console.log(message.consoleLog.sender + ': ' + message.consoleLog.message);
    }
    if (message.content) {
      var msg = message.content;
      if (msg.assault) {
        Lyria.Time.SetAssaultTime(msg.assault.times);
      }
      if (msg.angel) {
        Lyria.Time.SetAngelHalo(msg.angel.delta, msg.angel.active);
      }
      if (msg.defense) {
        Lyria.Time.SetDefenseOrder(msg.defense.time, msg.defense.active);
      }
      if (msg.checkRaids) {
        Lyria.Quest.CheckJoinedRaids(msg.checkRaids.raids, msg.checkRaids.unclaimed, msg.checkRaids.type);
      }
      if (msg.chips) {
        Lyria.Profile.SetChips(msg.chips.amount);
      }
      if (msg.profile) {
        Lyria.Profile.SetHomeProfile(msg.profile.rank, msg.profile.rankPercent, msg.profile.job, msg.profile.jobPercent, msg.profile.jobPoints, msg.profile.renown, msg.profile.prestige);
      }
      if (msg.event) {
        //Quest.SetEvent(msg.event);
      }
      if (msg.coopCode) {
        Lyria.Quest.SetCoopCode(msg.coopCode, sender.tab.id);
      }
    }
  });

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.url.indexOf('gbf.game.mbga.jp') !== -1) {
      if (currURL !== tab.url) {
        pageLoaded = false;
        currURL = tab.url;
      }
      if (currURL === tab.url && pageLoaded) {
        chrome.tabs.sendMessage(tabId, {pageUpdate: tab.url});
      }
    }
  });

  var connections = {};

  chrome.runtime.onConnect.addListener(function (port) {
    var extensionListener = function (message, sender) {
      if (message.connect) {
        connections[message.connect] = port;
        return;
      }
      if (message.initialize) {
        var response = [];
        response[0] = {
          'setTheme': Lyria.Options.Get('windowTheme')
        };
        response = response.concat(Lyria.Profile.InitializeDev());
        response = response.concat(Lyria.Time.InitializeDev());
        response = response.concat(Lyria.Dailies.InitializeDev());
        response = response.concat(Lyria.Casino.InitializeDev());
        response = response.concat(Lyria.Supplies.InitializeDev());
        response = response.concat(Lyria.Buffs.InitializeDev());
        response = response.concat(Lyria.Quest.InitializeDev());
        connections[message.id].postMessage({initialize: response});
        return;
      }
      if (message.pageLoad) {
        pageLoaded = true;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {pageLoad: tabs[0].url});
            connections[message.id].postMessage({pageLoad: tabs[0].url});
            var index = tabs[0].url.indexOf('#quest/supporter/');
            if (index !== -1) {
              Lyria.Message.PostAll({'setClick': {
                'id':    '#quest-repeat',
                'value': tabs[0].url.slice(index)
              }});
            } else {
              index = tabs[0].url.indexOf('#event/');
              if (index !== -1 && tabs[0].url.indexOf('/supporter/') !== -1)
              {
                Lyria.Message.PostAll({'setClick': {
                  'id':    '#quest-repeat',
                  'value': tabs[0].url.slice(index)
                }});
              }
            }
          }
        });
        return;
      }
      if (message.openURL) {
        chrome.tabs.update(message.id, {'url': message.openURL});
        return;
      }
      if (message.getPlanner) {
        Lyria.Supplies.GetPlanner(message.id, message.getPlanner);
      }
      if (message.refresh) {
        chrome.tabs.reload(message.id);
        return;
      }
      if (message.devAwake) {
        if (currentVersion !== CURRENT_VERSION) {
          var note = '';
          if (patchNotes[currentVersion] === undefined) {
            currentVersion = BASE_VERSION;
            note += generateNote(currentVersion);
          }
          var index = patchNotes[currentVersion].index + 1;
          for (var i = index; i < patchNoteList.length; i++) {
            currentVersion = patchNoteList[i];
            note += generateNote(currentVersion);
          }
          Lyria.Message.Post(message.id, {'setMessage': note});
          currentVersion = CURRENT_VERSION;
          Lyria.Storage.Set('version', CURRENT_VERSION);
        }
        Lyria.Message.Post(message.id, {'setTheme': Lyria.Options.Get('windowTheme', function(id, value) {
          Lyria.Message.PostAll({
            'setTheme': value
          });
          Lyria.Time.UpdateAlertColor();
        })});
      }
      if (message.debug) {
        Lyria.Message.Notify('hey', 'its me ur brother', 'apNotifications');
        Lyria.APBP.SetMax();
      }
      if (message.weaponBuild) {
        Lyria.Supplies.BuildWeapon(message.id, message.weaponBuild);
      }
      if (message.consoleLog) {
        console.log(message.consoleLog);
      }
      if (message.request) {
        //verify current ap/ep
        if (message.request.url.indexOf('/user/status?') !== -1 ||
            message.request.url.indexOf('/user/data_assets?') !== -1 ||
            message.request.url.indexOf('/user/content/index?') !== -1 ||
            message.request.url.indexOf('/quest/content/') !== -1 ||
            message.request.url.indexOf('/coopraid/content/') !== -1) {
          Lyria.APBP.VerifyAPBP(message.request.response);
          Lyria.Profile.SetLupiCrystal(message.request.response);
        }
        //check entering raid resources
        if (message.request.url.indexOf('/quest/treasure_raid')  !== -1) {
          Lyria.Supplies.RaidTreasureInfo(message.request.response);
        }
        //check limited quest
        if (message.request.url.indexOf('/quest/check_quest_start/') !== -1) {
          Lyria.Quest.CheckDailyRaid(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('/quest/content/newindex/') !== -1) {
          Lyria.Quest.UpdateInProgress(message.request.response, message.id);
        }
        //initialize quest -> SELECTING QUEST
        if (message.request.url.indexOf('/quest/quest_data/') !== -1) {
          Lyria.APBP.InitializeQuest(message.request.response);
        }
        //start quest -> ACTUALLY ENTER THE QUEST
        if (message.request.url.indexOf('/quest/create_quest?') !== -1) {
          Lyria.Quest.CreateQuest(message.request.response, message.request.payload, message.id);
          Lyria.APBP.StartQuest(message.request.response, message.request.payload);
          Lyria.Dailies.DecPrimarchs(message.request.payload);
        }
        if (message.request.url.indexOf('/quest/raid_info?') !== -1) {
          Lyria.Quest.CheckMulti(message.request.response);
          //is_multi
        }

        //quest loot
        // if(message.request.url.indexOf('/result/content/') !== -1) {
        //   Supplies.GetLoot(message.request.response.option.result_data);
        //   Profile.CompleteQuest(message.request.response.option.result_data);
        // }
        if (message.request.url.indexOf('/result/data/') !== -1) {
          Lyria.Supplies.GetLoot(message.request.response);
          Lyria.Profile.CompleteQuest(message.request.response);
        }
        // //initialize raid -> SELECTING RAID
        // if(message.request.url.indexOf('/quest/assist_list') !== -1) {
        //     APBP.InitializeRaid(message.request.response);
        // }
        // //initialize raid through code
        // if(message.request.url.indexOf('/quest/battle_key_check') !== -1) {
        //     APBP.InitializeRaidCode(message.request.response);
        // }
        //join raid
        if (message.request.url.indexOf('/quest/raid_deck_data_create') !== -1) {
          Lyria.APBP.StartRaid(message.request.response, message.request.payload);
          Lyria.Quest.CreateRaid(message.request.response, message.id);
        }
        // if(message.request.url.indexOf('/check_reward/') !== -1) {
        //   Quest.CompleteQuest(message.request.url);
        // }
        //raid loot
        // if(message.request.url.indexOf('/resultmulti/content/') !== -1) {
        //     Supplies.GetLoot(message.request.response.option.result_data);
        //     Profile.CompleteRaid(message.request.response.option.result_data);
        //     Dailies.CompleteCoop(message.request.response.option.result_data);
        //     Dailies.CompleteRaid(message.request.response.option.result_data);
        // }
        if (message.request.url.indexOf('/resultmulti/data/') !== -1) {
          Lyria.Supplies.GetLoot(message.request.response);
          Lyria.Profile.CompleteRaid(message.request.response);
          Lyria.Dailies.CompleteCoop(message.request.response);
          Lyria.Dailies.CompleteRaid(message.request.response);
        }
        if (message.request.url.indexOf('retire.json') !== -1) {
          Lyria.Quest.AbandonQuest(message.request.payload);
        }

        //restore ap/bp
        if (message.request.url.indexOf('/quest/user_item') !== -1) {
          Lyria.APBP.RestoreAPBP(message.request.response);
          Lyria.Supplies.UseRecovery(message.request.response, message.request.payload);
        }
        //gacha
        if (message.request.url.indexOf('/gacha/list?_=') !== -1) {
          Lyria.Dailies.SetDraws(message.request.response);
        }
        if (message.request.url.indexOf('/gacha/normal/result//normal/6?_=') !== -1) {
          Lyria.Dailies.DecDraws(message.request.response);
          Lyria.Profile.LupiDraw(message.request.response);
        }
        if (message.request.url.indexOf('/gacha/result//legend') !== -1) {
          Lyria.Dailies.DecDraws(message.request.response);
          //Profile.CrystalDraw(message.request.response);
        }
        //co-op dailies
        if (message.request.url.indexOf('/coopraid/daily_mission?_=') !== -1) {
          Lyria.Dailies.SetCoop(message.request.response);
        }
        //casino list
        if (message.request.url.indexOf('/casino/article_list/1/1?_=') !== -1 ||
            message.request.url.indexOf('/casino/article_list/undefined/1?_=') !== -1) {
          Lyria.Casino.SetCasino1(message.request.response);
          Lyria.Profile.SetChips(message.request.response.medal.number);
        }
        if (message.request.url.indexOf('/casino/article_list/undefined/2?_=') !== -1) {
          Lyria.Casino.SetCasino2(message.request.response);
          Lyria.Profile.SetChips(message.request.response.medal.number);
        }
        //casino buy
        if (message.request.url.indexOf('/casino/exchange?_=') !== -1) {
          Lyria.Casino.BuyCasino(message.request.response, message.request.payload);
          Lyria.Supplies.BuyCasino(message.request.response, message.request.payload);
        }
        if (message.request.url.indexOf('/twitter/twitter_info/') !== -1) {
          Lyria.Dailies.CheckTweet(message.request.response);
          Lyria.Quest.CopyTweet(message.request.response);
        }
        if (message.request.url.indexOf('/twitter/tweet?_=') !== -1) {
          Lyria.Dailies.UseTweet(message.request.response);
        }
        if (message.request.url.indexOf('/item/normal_item_list') !== -1) {
          Lyria.Supplies.SetRecovery(message.request.response);
        }
        if (message.request.url.indexOf('/item/evolution_items') !== -1) {
          Lyria.Supplies.SetPowerUp(message.request.response);
        }
        if (message.request.url.indexOf('/item/article_list') !== -1) {
          Lyria.Supplies.SetTreasure(message.request.response);
        }
        if (message.request.url.indexOf('/item/gacha_ticket_list') !== -1) {
          Lyria.Supplies.SetDraw(message.request.response);
        }
        if (message.request.url.indexOf('/present/possessed') !== -1) {
          Lyria.Profile.CheckWeaponSummon(message.request.response);
        }
        if (message.request.url.indexOf('/present/receive?') !== -1) {
          Lyria.Supplies.GetGift(message.request.response);
          Lyria.Profile.GetGift(message.request.response);
        }
        if (message.request.url.indexOf('/present/receive_all?') !== -1 ||
            message.request.url.indexOf('/present/term_receive_all?') !== -1) {
          Lyria.Supplies.GetAllGifts(message.request.response);
          Lyria.Profile.GetAllGifts(message.request.response);
        }
        //treasure trade purchase
        if (message.request.url.indexOf('/shop_exchange/purchase/') !== -1) {
          Lyria.Supplies.PurchaseItem(message.request.response);
          Lyria.Profile.PurchaseItem(message.request.response);
          Lyria.Dailies.PurchaseDistinction(message.request.response);
        }
        if (message.request.url.indexOf('/weapon/list/') !== -1) {
          Lyria.Profile.SetWeaponNumber(message.request.response);
        }
        if (message.request.url.indexOf('/npc/list/') !== -1) {
          Lyria.Profile.SetCharacterNumber(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('/summon/list/') !== -1) {
          Lyria.Profile.SetSummonNumber(message.request.response);
        }
        if (message.request.url.indexOf('/container/move?') !== -1) {
          Lyria.Profile.MoveFromStash(message.request.response);
        }
        if (message.request.url.indexOf('/listall/move?') !== -1) {
          Lyria.Profile.MoveToStash(message.request.response);
        }
        if (message.request.url.indexOf('/shop/point_list') !== -1) {
          Lyria.Profile.SetDrops(message.request.response);
        }
        //Moon shop
        if (message.request.url.indexOf('/shop_exchange/article_list/5/1/1/null/null/null?') !== -1 ||
            message.request.url.indexOf('/shop_exchange/article_list/5/1/1/null/null/3?') !== -1) {
          Lyria.Dailies.CheckMoons(message.request.response);
        }
        //do shop
        if (message.request.url.indexOf('/shop_exchange/article_list/10/1/1/null/null/') !== -1) {
          Lyria.Profile.SetDefense(message.request.response);
          //Dailies.CheckDefense(message.request.response, message.request.url);
        }
        //prestige
        if (message.request.url.indexOf('/shop_exchange/article_list/6/1/') !== -1) {
          Lyria.Dailies.SetDistinctions(message.request.response);
          //Dailies.CheckDefense(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('/shop/purchase') !== -1) {
          Lyria.Profile.SpendCrystals(message.request.response);
        }
        if (message.request.url.indexOf('mbp/mbp_info') !== -1 ||
            message.request.url.indexOf('/user/content/index?') !== -1) {
          Lyria.Dailies.CheckRenown(message.request.response);
        }
        if (message.request.url.indexOf('evolution_weapon/evolution?') !== -1 ||
            message.request.url.indexOf('evolution_summon/evolution?') !== -1) {
          Lyria.Profile.Uncap(message.request.response);
          Lyria.Profile.BuyUncap();
        }
        if (message.request.url.indexOf('evolution_weapon/item_evolution?') !== -1 ||
            message.request.url.indexOf('evolution_summon/item_evolution?') !== -1) {
          Lyria.Supplies.Uncap(message.request.response);
          Lyria.Profile.BuyUncap();
        }
        if (message.request.url.indexOf('item/evolution_items/') !== -1) {
          Lyria.Supplies.CheckUncapItem(message.request.response);
        }
        if (message.request.url.indexOf('item/evolution_item_one') !== -1) {
          Lyria.Supplies.SetUncapItem(message.request.response);
          Lyria.Profile.SetUncapItem(message.request.response);
        }
        if (message.request.url.indexOf('weapon/weapon_base_material?') !== -1 ||
            message.request.url.indexOf('summon/summon_base_material?') !== -1) {
          Supplies.SetUncap(message.request.response);
          Lyria.Profile.SetUncap(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('npc/evolution_materials') !== -1) {
          Lyria.Supplies.SetNpcUncap(message.request.response);
        }
        if (message.request.url.indexOf('evolution_npc/item_evolution?') !== -1) {
          Lyria.Supplies.NpcUncap(message.request.response);
          Lyria.Profile.BuyUncap();
        }
        if (message.request.url.indexOf('weapon/weapon_material') !== -1 ||
            message.request.url.indexOf('summon/summon_material') !== -1 ||
            message.request.url.indexOf('npc/npc_material') !== -1) {
          Lyria.Profile.SetUpgrade(message.request.response, message.request.url);
        }
        if (message.request.url.indexOf('enhancement_weapon/enhancement') !== -1 ||
            message.request.url.indexOf('enhancement_summon/enhancement') !== -1 ||
            message.request.url.indexOf('enhancement_npc/enhancement') !== -1) {
          Lyria.Profile.Upgrade(message.request.response);
        }

        if (message.request.url.indexOf('/shop_exchange/activate_personal_support?_=') !== -1) {
          Lyria.Buffs.StartBuff(message.request.response, message.request.payload);
        }
        if (message.request.url.indexOf('/sell_article/execute') !== -1) {
          Lyria.Supplies.SellCoop(message.request.response, message.request.payload);
        }
        if (message.request.url.indexOf('/raid/start.json?_=') !== -1 ||
            message.request.url.indexOf('/multiraid/start.json?_=') !== -1) {
          Lyria.Quest.StartBattle(message.request.response, message.id);
        }
        if (message.request.url.indexOf('/normal_attack_result.json?_=') !== -1 ||
            message.request.url.indexOf('/ability_result.json?_=') !== -1 ||
            message.request.url.indexOf('/summon_result.json?_=') !== -1) {
          Lyria.Quest.BattleAction(message.request.response, message.request.payload, message.id);
        }
        if (message.request.url.indexOf('/quest/init_list') !== -1) {
          Lyria.Quest.SetCurrentQuest(message.request.response);
        }
        if (message.request.url.indexOf('/quest/assist_list') !== -1) {
          Lyria.Quest.CheckJoinedRaids(message.request.response);
        }
        if (message.request.url.indexOf('/gacha/list?') !== -1) {
          Lyria.Dailies.CheckGacha(message.request.response);
        }
        if (message.request.url.indexOf('/gacha/legend/campaign') !== -1) {
          Lyria.Dailies.RollCampaign(message.request.response, message.request.payload);
        }
        if (message.request.url.indexOf('/quest/content/newextra') !== -1) {
          Lyria.Dailies.SetPrimarchs(message.request.response);
        }
      }
    };
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function(port) {
      port.onMessage.removeListener(extensionListener);

      var tabs = Object.keys(connections);
      for (var i = 0, len = tabs.length; i < len; i++) {
        if (connections[tabs[i]] == port) {
          delete connections[tabs[i]];
          break;
        }
      }
    });
  });

// TODO: I think this is supposed to be the contents of message.js
  window.Lyria.Message = {
    PostAll: function(message) {
      Object.keys(connections).forEach(function(key) {
        if (message !== undefined) {
          connections[key].postMessage(message);
        }
      });
    },

    Post: function(id, message) {
      if (connections[id] !== undefined) {
        if (message !== undefined) {
          connections[id].postMessage(message);
        }
        return true;
      } else {
        return false;
      }
    },

    Notify: function(title, message, source) {
      if (Lyria.Options.Get('enableNotifications') && Lyria.Options.Get(source)) {
        var theme = Lyria.Options.Get('notificationTheme');
        if (theme === 'Random') {
          var rand = Math.random() * 3;
          if (rand < 1) {
            theme = 'Sheep';
          } else if (rand < 2) {
            theme = 'Rooster';
          } else {
            theme = 'Monkey';
          }
        }
        if (new Date().getMonth() === 3 && new Date().getDate() === 1) {
          theme = 'Garbage';
        }
        if (!Lyria.Options.Get('muteNotifications')) {
          var sound = new Audio('src/assets/sounds/' + theme + '.wav');
          sound.play();
        }
        if (Math.random() * 300 < 1) {
          theme += '2';
        }
        chrome.notifications.create({
          type:   'basic',
          title:   title,
          message: message,
          iconUrl: 'src/assets/images/' + theme + '.png'
        });
      }
    },

    OpenURL: function(url, devID) {
      chrome.runtime.sendMessage({openURL: {
        url: url
      }});

    },

    MessageBackground: function(message, sendResponse) {
    },

    MessageTabs: function(message, sendResponse) {
      chrome.runtime.sendMessage({tabs: message}, function(response) {
        sendResponse(response);
      });
    },

    ConsoleLog: function(sender, message) {
      chrome.runtime.sendMessage({consoleLog: {
        sender: sender,
        message: message
      }});
    }
  };

})();

import random 
import sys
import json
from datetime import datetime
import time
from dateutil.relativedelta import relativedelta
 
def bt_make_group(userids):
    return { uid: 0.8 + random.random() * 0.2 for uid in userids }

def make_call_user(uid, min):
    return { uid: min + random.random() * (1-min) }
    
def generate_bt():
    #1:Pawel Antemijczuk,Jaunita Vallee
    #3:Jeanna Huson,Andree Vanmeter
    #5:Quincy Orick,Harmony Digirolamo
    #7:Jolie Matheney,Kena Hamby
    #9:Nicole Kang,Josue Pierpont
    #11: Consuelo Sarver,Frida Elia
    #13:Anabel Kates,Roma Guiterrez
    #15:Bertha Folk,Melodee Pallas
    user_dic = {1:'db102906a343bea61d7e8866f4cb2b44',   2:'457840db734ddef73749fce6ed4cb31e',
            3:'89b914ebf70fa197f3c1c565f32ca8c0',   4:'457840db734ddef73749fce6ed7c6b49',
            5: '457840db734ddef73749fce6ed674ea9',  6: '012518ce4184b6db28f5ed1c7c0f7939',
            7: '89b914ebf70fa197f3c1c565f32b2184',  8: '89b914ebf70fa197f3c1c565f334a06e', 
            9:'1cc7aad87ff370c835ab9f5d3ec59876',   10:'981266fecf8dfeba1995c776c2265bf4',
            11:'457840db734ddef73749fce6ed8c9e19',  12:'84c9750a8ff3cc3b72c474c568f66d93',
            13:'84c9750a8ff3cc3b72c474c568a04feb',  14:'7ca0e8909e8cd9b4b2cff3a9279f6d17',
            15:'84c9750a8ff3cc3b72c474c568f328be',  16:'84c9750a8ff3cc3b72c474c568e0f6f8'}

    users_groups_weekday = [{'group': bt_make_group([1,2,3,4,5]), 'prob': 0.20},    # Commonly met during weekday (20% chance)
                            {'group': bt_make_group([1,6,10,11]), 'prob': 0.35},    # Commonly met during weekday (15% chance)
                            {'group': bt_make_group([6,7,8,9,10]), 'prob': 0.36},    # Rarely met during weekday (5% chance)
                            {'group': bt_make_group([13,14,15,16]), 'prob': 0.5}]   # Somewhat met during weekday (10% chance)
    users_groups_weekend = [{'group': bt_make_group([2,16,12]), 'prob': 0.35},      # Often met during weekend (35% chance)
                            {'group': bt_make_group([1,4,10]), 'prob': 0.5}]        # Commonly met during weekend (15% chance)

    users_call = [{'group' : [1,2,9], 'prob': 0.8},                                 # Friends we often call
                  {'group' : [3,4,5,6,7,8,10,11,12,13,14,15,16], 'prob': 1}]        # Acquiatances we rarely call
  
    users_sms = [{'group' : [1,9], 'prob': 0.8},                                    # Friends we often call
                 {'group' : [2,3,4,5,6,7,8,10,11,12,13,14,15,16], 'prob': 1}]       # Acquiatances we rarely call

    btFile = open('bt', 'w')
    callFile = open('call', 'w')
    smsFile = open('sms', 'w')
    btFile.write('[')
    callFile.write('[')
    smsFile.write('[')
    
    t = datetime.now() + relativedelta(months=-3)
    now=datetime.now()
    while t < now:    
        bt_json = {"timestamp": "", "devices":[]}  
        timestamp = int(time.mktime(t.timetuple()))
        groups = []
        chosen_group = {}
        if t.weekday() < 5 and ((t.hour < 17 and t.hour >= 13) or (t.hour < 12 and t.hour >= 8)):       
            groups = users_groups_weekday
        elif (t.weekday() >=5 and t.hour >= 8 and t.hour < 17) or (t.hour < 13 and t.hour >= 12) or (t.hour >= 17) or (t.hour < 2):
            groups = users_groups_weekend          
        
        rnd_grp = random.random()
        for grp in groups:
            if rnd_grp < grp['prob']:
                chosen_group = grp['group']
                break
        if chosen_group == {}:
             t += relativedelta(seconds=+random.randint(30, 60))
             continue 

        bt_json["timestamp"] = timestamp
        for uid in chosen_group.keys():
            if random.random() < chosen_group[uid]: 
                bt_json["devices"].extend([{'sensible_user_id': user_dic[uid]}])

        rnd_grp = random.random()
        another_group = {}
        for grp in groups:
            if rnd_grp < grp['prob']/4 and another_group != chosen_group:
                another_group = grp['group']
                break
        for uid in another_group.keys():
            if random.random() < another_group[uid]: 
                bt_json["devices"].extend([{'sensible_user_id': user_dic[uid]}])
                
        btFile.write(json.dumps(bt_json) + ',')
        if random.random() < 0.05:
            rnd_grp = random.random()
            for grp in users_call:
                if rnd_grp < grp['prob']:
                    callFile.write(json.dumps({'timestamp': timestamp, 
                                               'call' : { 'number' : user_dic[random.choice(grp['group'])], 
                                                         'duration' : random.randint(10, 180)}}) + ',')
        if random.random() < 0.1:
            rnd_grp = random.random()
            for grp in users_call:
                if rnd_grp < grp['prob']:
                    smsFile.write(json.dumps({'timestamp': timestamp, 
                                               'message' : { 'address' : user_dic[random.choice(grp['group'])]}}) + ',')

        
        
        
        t += relativedelta(minutes=+random.randint(30, 60))


    btFile.seek(-1,1)
    callFile.seek(-1,1)
    smsFile.seek(-1,1)

    btFile.write(']')
    callFile.write(']')
    smsFile.write(']')

    btFile.close()
    callFile.close()
    smsFile.close()

generate_bt()

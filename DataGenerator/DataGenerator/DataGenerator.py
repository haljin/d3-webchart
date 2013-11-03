import sqlite3 as lite
import random 
import pickle
#import simplejson
import sys
import json
from datetime import datetime
import time
from dateutil.relativedelta import relativedelta
 
def bt_make_group(userids):
    return { uid: 0.8 + random.random() * 0.2 for uid in userids }
    
def generate_bt():
    # 2 groups (1,2,3,4) and (10, 11)
    users_groups_weekday = [{'group': bt_make_group([1,2,3,4,5]), 'prob': 0.20}, 
                            {'group': bt_make_group([1,6,10,11]), 'prob': 0.35},
                            {'group': bt_make_group([6,7,8,9,10]), 'prob': 0.4},
                            {'group': bt_make_group([13,14,15,16]), 'prob': 0.5}]
    users_groups_weekend = [{'group': bt_make_group([2,16,12]), 'prob': 0.35},
                            {'group': bt_make_group([1,4,10]), 'prob': 0.5}] 
    #1:Pawel Antemijczuk,Jaunita Vallee
    #3:Jeanna Huson,Andree Vanmeter
    #5:Quincy Orick,Harmony Digirolamo
    #7:Jolie Matheney,Kena Hamby
    #9:Nicole Kang,Josue Pierpont
    #11: Consuelo Sarver,Frida Elia
    #13:Anabel Kates,Roma Guiterrez
    #15:Bertha Folk,Melodee Pallas
    user_dic = {1:'db102906a343bea61d7e8866f4cb2b44',2:'457840db734ddef73749fce6ed4cb31e',
                3:'89b914ebf70fa197f3c1c565f32ca8c0',4:'457840db734ddef73749fce6ed7c6b49',
                5: '457840db734ddef73749fce6ed674ea9', 6: '012518ce4184b6db28f5ed1c7c0f7939',
                7: '89b914ebf70fa197f3c1c565f32b2184', 8: '89b914ebf70fa197f3c1c565f334a06e', 
                9:'1cc7aad87ff370c835ab9f5d3ec59876', 10:'981266fecf8dfeba1995c776c2265bf4',
                11:'457840db734ddef73749fce6ed8c9e19', 12:'84c9750a8ff3cc3b72c474c568f66d93',
                13:'84c9750a8ff3cc3b72c474c568a04feb',14:'7ca0e8909e8cd9b4b2cff3a9279f6d17',
                15:'84c9750a8ff3cc3b72c474c568f328be',16:'84c9750a8ff3cc3b72c474c568e0f6f8'}
    #con = lite.connect('bt_generated.db')
    myFile = open('data', 'w')
    myFile.write('[')
    c = 0
    
    t = datetime.now() + relativedelta(months=-3)
    now=datetime.now()
    # 7 days simulation
    while t < now:    
        json_timestamp = {"timestamp": "", "devices":[]}    
        groups = []
        chosen_group = {}
        if t.weekday() < 5 and ((t.hour < 17 and t.hour >= 13) or (t.hour < 12 and t.hour >= 8)):       
            groups = users_groups_weekday
        elif (t.weekday() >=5 and t.hour >= 8 and t.hour < 17) or (t.hour < 13 and t.hour >= 12) or (t.hour >= 17) or (t.hour < 2):
            groups = users_groups_weekend
        else:
           t += relativedelta(seconds=+random.randint(30, 60))
           continue 
        
        rnd_grp = random.random()
        for grp in groups:
            if rnd_grp < grp['prob']:
                chosen_group = grp['group']
                break
        if chosen_group != {}:
            json_timestamp["timestamp"] = int(time.mktime(t.timetuple()))
            #myFile.write('{"timestamp": %d,"devices": ['% time.mktime(t.timetuple()))
        for uid in chosen_group.keys():
            # randomly generate a contact with a user in the same group
            if random.random() < chosen_group[uid]: 
                json_timestamp["devices"].extend([{'sensible_user_id': user_dic[uid]}])
                #myFile.write('{"sensible_user_id": "'+user_dic[uid]+'"},')

        rnd_grp = random.random()
        another_group = {}
        for grp in groups:
            if rnd_grp < grp['prob']/4 and another_group != chosen_group:
                another_group = grp['group']
                break
        for uid in another_group.keys():
            # randomly generate a contact with a user in the same group
            if random.random() < another_group[uid]: 
                json_timestamp["devices"].extend([{'sensible_user_id': user_dic[uid]}])
        #myFile.seek(-1,1)
        # move simulation ahead betwen 10 and 60 min
        t += relativedelta(seconds=+random.randint(30, 60))
        if chosen_group != {}:
            myFile.write(json.dumps(json_timestamp) + ',')
    #print 'generated ', c, 'entries'
    myFile.seek(-1,1)
    myFile.write(']')

generate_bt()

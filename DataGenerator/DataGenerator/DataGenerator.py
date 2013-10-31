import sqlite3 as lite
import random 
import pickle
#import simplejson
import sys
from datetime import datetime
import time
from dateutil.relativedelta import relativedelta
 
def bt_make_group(userids):
    return { uid: 0.8 + random.random() * 0.2 for uid in userids }
    
def generate_bt():
    # 2 groups (1,2,3,4) and (10, 11)
    users_groups_weekday = [{'group': bt_make_group([1,2,3,4,5]), 'prob': 0.35}, 
                            {'group': bt_make_group([1,6,10,11]), 'prob': 0.7},
                            {'group': bt_make_group([6,7,8,9,10]), 'prob': 0.9},
                            {'group': bt_make_group([13,14,15,16]), 'prob': 1.0}]
    users_groups_weekend = [{'group': bt_make_group([2,3,12]), 'prob': 0.8},
                            {'group': bt_make_group([1,4,10]), 'prob': 1}] 

    user_dic = {1:'db102906a343bea61d7e8866f4cb2b44',2:'457840db734ddef73749fce6ed4cb31e',
                3:'89b914ebf70fa197f3c1c565f32ca8c0',4:'457840db734ddef73749fce6ed7c6b49',
                5: '', 6: '', 7: '', 8: '', 9:'',
                10:'c',11:'457840db734ddef73749fce6ed8c9e19',
                12:'',13:'',14:'',15:'',16:''}
    #con = lite.connect('bt_generated.db')
    myFile = open('data', 'w')
    myFile.write('[')
    c = 0
    
    t = datetime.now() + relativedelta(months=-1)
    now=datetime.now()
    # 7 days simulation
    while t < now:
        myFile.write('{"timestamp": %d,"devices": ['% time.mktime(t.timetuple()))
        groups = []
        chosen_group = {}
        if t.weekday() < 5 and t.hour < 17 and t.hour > 0:       
            groups = users_groups_weekday
        else:
            groups = users_groups_weekend
        rnd_grp = random.random()
        for grp in groups:
            if rnd_grp < grp['prob']:
                chosen_group = grp['group']
                break
        for uid in chosen_group.keys():
            # randomly generate a contact with a user in the same group
            if random.random() < chosen_group[uid]: 
                myFile.write('{"sensible_user_id": "'+user_dic[uid]+'"},')
        # move simulation ahead betwen 10 and 60 min
        t += relativedelta(seconds=+random.randint(30, 60))
        myFile.write(']}')
    #print 'generated ', c, 'entries'
    myFile.write(']')

generate_bt()

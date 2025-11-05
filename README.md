
# Translation Webhook

Express service that powers the Google Docs add-on.  
Accepts translation jobs and relays them to either xAI or Claude before replying with the translated text.

## HTTP Contract

- **Endpoint:** `POST /`
- **Request JSON:** `{ "provider": "claude" | "xai", "prompt": "text to translate", "metadata": { ... } }`
- `provider` is optional; requests default to `xai` when omitted.
- **Successful response:** `{ "translation": "translated text", "prompt": "prompt text (trimmed)" }`
- **Error response:** `{ "error": "message" }` with an appropriate status code.

`metadata` is optional and forwarded to the model as additional context.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Port to listen on (defaults to 3000). |
| `XAI_API_KEY` | When using provider `xai` | API key from xAI (Grok). |
| `XAI_MODEL` | No | Grok model name, defaults to `grok-1`. |
| `ANTHROPIC_API_KEY` | When using provider `claude` | API key for Anthropic Claude. |
| `ANTHROPIC_MODEL` | No | Claude model, defaults to `claude-3-haiku-20240307`. |
| `ANTHROPIC_MAX_TOKENS` | No | Overrides the max tokens sent to Claude (default `1024`). |

> **Tip:** A `404` response from xAI usually means the model name is wrong. Set `XAI_MODEL` to the exact model ID listed in your xAI dashboard (for example `grok-1.5-mini`).

Create a `.env` file locally if you prefer:

```
XAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Local Development

```bash
npm install
npm start
```

Send a test request:

```bash
curl -s http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","prompt":"Translate to Traditional Chinese: Hello, world!","metadata":{"docId":"abc"}}'

curl -s https://hello-webhook.onrender.com \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","prompt":"Translate to Traditional Chinese: mother!","metadata":{"docId":"abc"}}'

curl -s https://hello-webhook.onrender.com \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","prompt":"Translate to simplied Chinese: mother!","metadata":{"docId":"abc"}}'
```

## Deploy to Render

1. Push changes to GitHub.
2. In Render: **New ➜ Web Service**.
3. Select the repo and use the defaults:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add the required environment variables (API keys, model overrides).
5. Deploy. Render will provide the public HTTPS URL for the add-on.

## Google Docs Add-on Integration

Update the Apps Script to call the new contract, for example:

```javascript
function translateViaWebhook(promptText) {
  const url = 'https://<your-render-service>.onrender.com';
  const payload = {
    provider: 'claude', // omit to use xAI by default
    prompt: promptText,
    metadata: { docId: DocumentApp.getActiveDocument().getId() }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const body = JSON.parse(response.getContentText());
  if (!body.translation) {
    throw new Error(body.error || 'Translation failed');
  }
  return {
    translation: body.translation,
    prompt: body.prompt
  };
}
```

You can wrap this helper with your add-on menu handlers to surface translations inside the document.

## Update Workflow

1. Make your code changes locally and update `.env` if new secrets are required (never commit `.env`).
2. Run `npm install` when dependencies change, then commit the resulting `package-lock.json`.
3. Commit your changes and push to the main branch (`git add -A && git commit -m "Describe change" && git push`).
4. Render builds and deploys automatically from Git; confirm the latest deploy finished in the dashboard.
5. If you changed API keys, update them in Render → Environment tab → save; Render restarts the service using the new keys.

```bash

curl -s http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","prompt":"Translate to English: 个人陈述
我叫李婕，在中国的大学学的学前教育，后来我也做了老师 (我有教师资格证和大学毕业证)。我很喜欢孩子。我在大学读书的时候，被校方强制流产一次，我终身难忘。因为这个是和我老公之前的男友，所以我一直羞于提起，我不知道老公知道了会不会瞧不起我。但是午夜梦回，梦魇一样的经历时不时还会缠绕我。我恐惧回到那个专制国家。这种对专制国家的恐惧感胜过我个人的耻辱感。所以，我还是想把我的经历和美国政府分享，希望得到美国政府的帮助，不要送我回那个压迫我的国度。
我出生于1991年8月2日。2010年9月到2013年6月就读广东省华南师范大学。2010年9月的时候，我19岁，觉得自己已经是大人了。
我职业高中时有个男友小陈。他比我小一岁，是我的师弟。我们在大学前的暑假变得亲密，在他生日7月22号那天我把我的第一次给了他。
2010年入学后，9月初，大学新生体检，在学校的校医院。早上，我们新生先进行了登记，然后内科查血压，用听诊器听肺，去检验科采血，去皮肤科观察皮肤，在五官科看视力和看耳朵，最后男生检查结束后离开了，女同学去妇科查外阴。
我在妇科门口坐着等待的时候，辅导员老师就找来了。她问了我是不是李婕，出生于1991年8月2日。我说是。老师进去找了医生，然后出来了，也在外面等。我是最后一个被叫进妇科去的，快中午了。医生叫我脱了裙子和内裤，给我查了外阴。后来还给我用了B 超 – 我在电视上见过这个仪器。
B 超结束，医生给了我纸毛巾让我清理，她出去了。过一会有人敲门，辅导员和医生和2-3个护士都进来了。我惊呆了。我在想这是要干什么。辅导员说：李婕，医生发现你怀孕了，孩子不大。非法同居是违反学校校规校纪的行为。按照学校的相关规定我们需要马上处理。
我当时吓傻了，我完全没有感觉自己怀孕了！而且当时我也不太懂这个事啊！
我说：请问老师，要怎么处理？老师说: 你需要告诉我们谁是孩子的爸爸，这个人我们要追究责任。我哭了，使劲摇头：他不是我们学校的！不是我们学校的！老师说：是你之前学校的吗？告诉我们名字。你要交待发生性行为的时间，地点，对象，承认自己发生不正当性行为的错误。而且你这个孩子不能留。
我觉得好委屈。我说：老师，我已经19岁了，是大人了。我可以发生性行为。我也可以为我自己的行为负责任。我很爱我的男朋友。我更不想失去我的孩子。我们不是“不正当性行为”，我们是恋人！我们会结婚的！求求你，让我留下这个孩子。如果老师觉得我违反了校纪，你们可以处罚我，可以开除我！
老师说：19岁就是大人了？！婚姻法规定女性20岁才能结婚，单身女性不能生孩子，就算你被学校开除回到社会上，你也无法结婚生子！你有没有常识！
我惊呆了！我的确不懂。我还想争取留下这个孩子：我说老师你开除我吧！我离开学校后自己想办法！
老师说：就算学校处罚你，开除你，你也要先流产。你还不配合说出你男友的名字？不知廉耻，不知悔改。你要我们通知你家长和原来学校老师吗？
我大哭起来！我家里只有奶奶。妈妈在我出生7个月的时候就离开了这家，爸爸在我七岁时意外离世，从小我奶奶带着生活。我很孤单！想着自己能有一个孩子，就多了一个亲爱的人，这本来多好啊！
老师看我光哭不说好，语气柔和了：你也要顾你奶奶，她供你读书不容易。听话，你还年轻，以后还能生孩子。先好好学习找个好工作，再当妈妈。
我哭的有点晕了。因为体检一早也没吃什么东西，又抽了血。我觉得人有点虚脱瘫软。一个护士拿起我右手，涂了酒精，我觉得肩膀也被人按住了。拿我手的护士给我扎了一针。我想甩开她，但是没有甩开。没多久我晕过去了。
等我醒来，已经下午，我头晕，肚子很痛，没力气。下身带着卫生巾。护士看我醒了，给我拿来水，消炎药，告诉我2周不要同房，4周后复查，注意下体卫生，不要盆浴。我才明白我已经失去了孩子！我又大哭起来。
我情绪缓和后，我打电话让我的同学过来接我回宿舍。离开医院后，我有打电话给我男友，他听了很惊慌，我跟他说了一些事情的经过。之后他对我慢慢表现的很冷漠。我非常失望。和他关系逐渐变坏，不久就分开了。
这件事情之后，我时不时精神恍惚和抑郁，很容易哭泣，一点小事情就会引发我哭很久。
2017年1月，我认识了现在的老公后，我们都很爱孩子。我查了身体，医生说我子宫寒，子宫内膜偏薄 – 我知道流产刮宫会伤害子宫内膜。我听了心里很凉。我吃了不少中药，终于怀上了女儿，怀上女儿后，我2018年8月28日和现在老公登记结婚，2019年3月生了老大（女儿：YU WANG），2020年4月生了老二（儿子：YI WANG）。
哪怕有儿女和老公的抚慰，但是对那个早早来找我，又和我断了缘分的孩子，我还是非常的揪心，心疼和自责。我甚至都不知道他是男孩还是女孩。我经常一遍遍的心里和这个孩子说对不起：是妈妈没有保护好你，对不起。
我和别人的男人怀过孩子的事，我无法启齿告诉老公，我觉得很可耻，对他也愧疚。这种耻辱和愧疚加重了我抑郁症。我那个时候看心理医生，也要背着老公偷偷的看。
最近，我先生工作送货，因为不了解地形，被ICE 无端抓走。我很恐惧中国政府。想到要被遣送回那个迫害我的国家，我止不住的发抖，失眠。所以我决定把深埋在我心理的伤害说出来。
我们美签的时候，是打算旅游的。但是我老公因为政治观点被警察传唤和威胁，我们只能逃离中国，没有和美国海关说实话，实在抱歉。
谢谢您让我分享我的经历。我希望美国政府能够保护我们一家人。

李婕
2025年9月","metadata":{"docId":"abc"}}'

http://localhost:3000/
https://hello-webhook.onrender.com 
curl -s https://hello-webhook.onrender.com \
  -H "Content-Type: application/json" \
  --data-binary @payload.json


```bash

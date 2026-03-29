获取玩家信息
获取玩家信息的API都不需要身份验证得到的访问令牌，部分API可以查询没有购买游戏的注册账户。

获取玩家的UUID
输入
玩家的名称（不区分大小写）。

GET请求
https://api.mojang.com/users/profiles/minecraft/<玩家名称>
https://api.minecraftservices.com/minecraft/profile/lookup/name/<玩家名称>
响应
NBT复合标签/JSON对象 根标签
字符串id：玩家的UUID。
字符串name：正确大写的玩家名称。
布尔型legacy：如果此账户没有迁移到Mojang账户，输出中包含此项。
布尔型demo：如果是没有购买游戏的注册账户，输出中包含此项。
示例
https://api.mojang.com/users/profiles/minecraft/jeb_
提供玩家jeb_的UUID。

 {
   "name": "jeb_",
   "id": "853c80ef3c3749fdaa49938b674adae6"
 }
错误信息
如果没有命名为这个名字的玩家，返回HTTP状态码404。
批量获取玩家UUID
负载
一个存储小于10个的玩家名称字符串的JSON列表，玩家名称不区分大小写。

POST请求
https://api.mojang.com/profiles/minecraft

响应
NBT列表/JSON数组 给定玩家的所有UUID列表。对于不存在的玩家名称，将不返回任何结果。
NBT复合标签/JSON对象 玩家名称。
字符串id：玩家的UUID。
字符串name：正确大小写的玩家名称。
布尔型legacy：如果此账户没有迁移到Mojang账户，输出中包含此项。
布尔型demo：如果是没有购买游戏的注册账户，输出中包含此项。
示例
发送["jeb_","notch"]。

 [
   {
     "id": "853c80ef3c3749fdaa49938b674adae6",
     "name": "jeb_"
   },
   {
     "id": "069a79f444e94726a5befca90e38aaf5",
     "name": "Notch"
   }
 ]
错误信息
HTTP状态码	错误（error）	错误具体信息（errorMessage）	错误说明
400	CONSTRAINT_VIOLATION	size must be between 1 and 10	请求负载的JSON列表为空。
请求负载的JSON列表中元素数量大于10个。
Invalid profile name	请求负载的JSON列表中含有空字符串。
获取玩家名称
输入
玩家的UUID。

GET请求
https://api.minecraftservices.com/minecraft/profile/lookup/<UUID>

响应
同获取玩家UUID。

示例
https://api.minecraftservices.com/minecraft/profile/lookup/853c80ef3c3749fdaa49938b674adae6
返回如下结果：

{
  "id" : "853c80ef3c3749fdaa49938b674adae6",
  "name" : "jeb_"
}
错误信息
HTTP状态码	错误（error）	错误具体信息（errorMessage）	错误说明
404	NOT_FOUND	Not Found	此UUID不代表任何玩家。
400	CONSTRAINT_VIOLATION	Invalid UUID string: <输入的参数>	URI中的UUID无效。
获取玩家的皮肤和披风
输入
玩家的UUID以及签名的请求。可以在一分钟后最早重复对给定UUID的查询。

GET请求
https://sessionserver.mojang.com/session/minecraft/profile/<UUID> 或
https://sessionserver.mojang.com/session/minecraft/profile/<UUID>?unsigned=false

响应
NBT复合标签/JSON对象 根标签
字符串id：玩家的UUID。
字符串name：正确大写的玩家名称。
布尔型legacy：如果这个账户是一个旧的Minecraft账户，这项才存在。
NBT列表/JSON数组properties：玩家属性的列表。
字符串name：玩家属性的名称。到目前为止只有textures（玩家纹理）这一属性。
字符串signature：只有在请求unsigned=false时，使用Yggdrasil私钥的签名才会作为Base64字符串传递。
字符串value：Base64字符串，其中包含玩家所有的纹理（皮肤和披风）。解码后的字符串内容如下：
NBT复合标签/JSON对象 纹理对象。
整型timestamp：Unix时间戳，以毫秒为单位，时间为调用纹理数据的时间。
字符串profileId：玩家的UUID，不带连字符。
字符串profileName: 玩家名称。
布尔型signatureRequired: 只有在请求unsigned=false时才存在。
NBT复合标签/JSON对象textures：纹理。
NBT复合标签/JSON对象SKIN：皮肤纹理。如果这名玩家没有自定义皮肤，这项不存在。
字符串url：皮肤纹理的URL链接。
NBT复合标签/JSON对象metadata：可选。皮肤的元数据。
字符串model：固定值slim。当皮肤模型为Alex时这一项才存在，模型为Steve则无该元数据。
NBT复合标签/JSON对象CAPE：披风纹理。如果这名玩家没有披风，这项不存在。
字符串url：披风纹理的URL链接。默认没有披风，仅当Mojang在玩家的账户数据中输入了披风时，才会显示披风。
示例
https://sessionserver.mojang.com/session/minecraft/profile/853c80ef3c3749fdaa49938b674adae6
返回如下结果：

 {
   "id": "853c80ef3c3749fdaa49938b674adae6",
   "name": "jeb_",
   "properties":
   [
     {
       "name": "textures",
       "value": "ewogICJ0aW1lc3R..."
     }
   ]
 }
其中字符串value使用Base64解码之后的内容为：

{
  "timestamp" : 1653838459263,
  "profileId" : "853c80ef3c3749fdaa49938b674adae6",
  "profileName" : "jeb_",
  "textures" : {
    "SKIN" : {
      "url" : "http://textures.minecraft.net/texture/7fd9ba42a7c81eeea22f1524271ae85a8e045ce0af5a6ae16c6406ae917e68b5"
    },
    "CAPE" : {
      "url" : "http://textures.minecraft.net/texture/9e507afc56359978a3eb3e32367042b853cddd0995d17d0da995662913fb00f7"
    }
  }
}
错误信息
HTTP状态码	错误（error）	错误具体信息（errorMessage）	错误说明
204	（返回空负载）	（返回空负载）	此UUID不代表任何玩家。
400	（无）	Not a valid UUID: <输入的参数>	URI中的UUID无效。
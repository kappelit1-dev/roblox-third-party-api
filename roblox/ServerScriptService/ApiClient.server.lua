local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local BASE_URL = "https://your-public-api-url.com"
local API_KEY = "replace-with-your-api-key"

local function request(method, path, bodyTable)
	local requestOptions = {
		Url = BASE_URL .. path,
		Method = method,
		Headers = {
			["Content-Type"] = "application/json",
			["x-api-key"] = API_KEY
		}
	}

	if bodyTable then
		requestOptions.Body = HttpService:JSONEncode(bodyTable)
	end

	local ok, response = pcall(function()
		return HttpService:RequestAsync(requestOptions)
	end)

	if not ok then
		warn("HTTP request failed:", response)
		return nil
	end

	if not response.Success then
		warn("API error:", response.StatusCode, response.Body)
		return nil
	end

	local decodeOk, data = pcall(function()
		return HttpService:JSONDecode(response.Body)
	end)

	if not decodeOk then
		warn("Failed to parse JSON:", response.Body)
		return nil
	end

	return data
end

Players.PlayerAdded:Connect(function(player)
	local profile = request("GET", "/api/profile/" .. tostring(player.UserId))
	if profile then
		print(
			"Loaded profile for",
			player.Name,
			"displayName =",
			profile.user and profile.user.displayName,
			"coins =",
			profile.economy and profile.economy.coins
		)
	end

	local reward = request("POST", "/api/reward", {
		userId = player.UserId,
		amount = 50
	})

	if reward then
		print("Reward applied for", player.Name, "newCoins =", reward.newCoins)
	end
end)

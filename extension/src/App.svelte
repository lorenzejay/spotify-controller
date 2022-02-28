<script >
	import {onMount} from 'svelte'
	let loading = true;
	let user = null;
	let currentlyListeningTo = null
	// access token recived from extension script 
	onMount(async() => {
		//listen if our spotify token expired else refresh it ${paiBaseUrl}/refresh_token

		const userResponse = await fetch(`${apiBaseUrl}/me`, {headers: {authorization: `Bearer ${accessToken}`}});
		if(!userResponse){
			return 
		}
		const listingToRes = await fetch(`${apiBaseUrl}/currently-listening-to`, {headers: {authorization: `Bearer ${accessToken}`}});
		const listingToData = await listingToRes.json() //{listingTo:data}
		const userData = await userResponse.json() // {user:data}
		
		user = userData.user;
		currentlyListeningTo = listingToData.listeningTo;
		loading = false;
		console.log(currentlyListeningTo)
		// window.onunhandledrejection(e => {
		// 	e.console.log('error:', e)
		// 	authenticate()
		// })
	})
	async function playNext() {
		
		const response = await fetch(`${apiBaseUrl}/play-next`,{headers: {Authorization: `Bearer ${accessToken}`}})
		const data = await response.json()
		if(data){
			currentlyListeningTo = data.listeningTo
		}
		// const response	await fetch(`${apiBaseUrl}/play-next`,{headers: {Authorization: `Bearer ${accessToken}`}})
	
	}
	async function playPrev() {
		
	 	const response = await fetch(`${apiBaseUrl}/play-previous`,{headers: {Authorization: `Bearer ${accessToken}`}})
		 const data = await response.json()
		if(data){
			currentlyListeningTo = data.listeningTo
		}
	}
	async function pausePlayback() {
		
	 	const response = await fetch(`${apiBaseUrl}/pause-playback`,{headers: {Authorization: `Bearer ${accessToken}`}})
		 const data = await response.json()
		if(data){
			currentlyListeningTo = data.listeningTo
		}
	}
</script>

{#if loading}
	<div>dasd</div>
{:else if user !== null}
<main>	
	{#if currentlyListeningTo.item.album.images}
	<img src={currentlyListeningTo.item.album.images[0].url} alt='profile for spotify user'/>
	{/if}

	<a href={currentlyListeningTo.context.external_urls.spotify}>{currentlyListeningTo.context.external_urls.spotify}</a>
	<h1>{currentlyListeningTo.item.name}</h1>
	
	{#each currentlyListeningTo.item.artists as artist}
	<p>{artist.name}</p>
	{/each}
	<p>{user.display_name}</p> 
	<div>
		<button on:click={playPrev}>Play Prev</button>
		<button on:click={pausePlayback}>Pause</button>

		<button on:click={playNext}>Play Next</button>
	</div>
</main>

{:else}
	<div>No user is logged in</div>
{/if}


<style>
	main {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
	img{
		width: 25vw;
		height: 25vh;
		object-fit: cover;

	}
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
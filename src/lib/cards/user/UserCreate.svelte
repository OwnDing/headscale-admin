<script lang="ts">
	import { createUser } from '$lib/common/api';
	import { createUserWithNamespace } from '$lib/common/grpc';
	import { toastError, toastSuccess, focus } from '$lib/common/funcs';
	import { App } from '$lib/States.svelte';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import RawMdiCheckCircleOutline from '~icons/mdi/check-circle-outline';
	
	type UserCreateProps = {
		show: boolean,
		loading?: boolean,
	};

	let { show = $bindable(), loading = $bindable(false)}: UserCreateProps = $props()

	let username = $state('');
	let namespace = $state('');
	const toastStore = getToastStore();

	// Check if gRPC is configured to show namespace field
	const isGrpcConfigured = $derived(App.isGrpcConfigured);

	async function newUser(event?: Event) {
		event?.preventDefault()

		loading = true;
		try {
			let u;

			// 根据用户需求：只填写用户名时使用 REST API，同时填写用户名和命名空间时使用 gRPC API
			if (isGrpcConfigured && namespace.trim() !== '') {
				// 同时填写了用户名和命名空间，使用 gRPC API 创建带 display_name 的用户
				u = await createUserWithNamespace(App.grpcConfig.value, username, namespace);
				toastSuccess(`✅ 用户 "${username}" 创建成功！命名空间: "${namespace}" (gRPC)`, toastStore);
			} else {
				// 只填写了用户名，使用 REST API 进行标准用户创建
				u = await createUser(username);
				toastSuccess(`✅ 用户 "${username}" 创建成功！(REST API)`, toastStore);
			}

			App.users.value.push(u);
			show = false;
			username = '';
			namespace = '';
		} catch (error) {
			if (error instanceof Error) {
				const apiType = (isGrpcConfigured && namespace.trim() !== '') ? 'gRPC' : 'REST';
				toastError(`Failed to create user "${username}" via ${apiType}`, toastStore, error);
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex w-full">
	<form onsubmit={newUser} class="w-full">
		<div class="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
			<input
				class="input rounded-md flex-1"
				type="text"
				placeholder="New Username..."
				disabled={loading}
				bind:value={username}
				use:focus
			/>
			{#if isGrpcConfigured}
				<input
					class="input rounded-md flex-1"
					type="text"
					placeholder="Namespace (optional)..."
					disabled={loading}
					bind:value={namespace}
				/>
			{/if}
			<button type="submit" class="btn btn-icon" disabled={loading || !username.trim()}>
				<RawMdiCheckCircleOutline />
			</button>
		</div>
		{#if isGrpcConfigured}
			<div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				{#if namespace.trim() !== ''}
					🚀 将通过 gRPC API 创建用户，命名空间设置为 "{namespace}"
				{:else}
					ℹ️ 将通过 REST API 创建标准用户（填写命名空间可使用 gRPC API）
				{/if}
			</div>
		{/if}
	</form>
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import { App } from '$lib/States.svelte';
	import { GrpcDebugger } from '$lib/common/grpc/debug';
	import { testGrpcConnection } from '$lib/common/grpc';
	import type { GrpcConfig } from '$lib/common/types';

	let debugResults = $state<{
		connectivity?: any;
		configRecommendations?: string[];
		connectionTest?: any;
		loading: boolean;
	}>({ loading: false });

	let testConfig = $state<GrpcConfig>({
		serverAddress: 'localhost',
		enableTls: false,
		port: 8080,
		timeoutMs: 10000,
		apiKey: '',
	});

	async function runDiagnostics() {
		debugResults.loading = true;
		
		try {
			// Test basic connectivity
			const connectivity = await GrpcDebugger.testBasicConnectivity(testConfig);
			
			// Get configuration recommendations
			const configRecommendations = GrpcDebugger.getConfigurationRecommendations(testConfig);
			
			// Test gRPC connection if API key is provided
			let connectionTest = null;
			if (testConfig.apiKey) {
				connectionTest = await testGrpcConnection(testConfig);
				console.log('gRPC connection test result:', connectionTest);
			}

			debugResults = {
				connectivity,
				configRecommendations,
				connectionTest,
				loading: false
			};
		} catch (error) {
			console.error('Diagnostics failed:', error);
			debugResults.loading = false;
		}
	}

	onMount(() => {
		// Load saved config
		testConfig = { ...App.grpcConfig.value };
	});
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold mb-8">gRPC 连接诊断工具</h1>
		
		<!-- Configuration Section -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
			<h2 class="text-xl font-semibold mb-4">测试配置</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div>
					<label class="block text-sm font-medium mb-1">服务器地址:</label>
					<input
						class="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
						type="text"
						bind:value={testConfig.serverAddress}
						placeholder="localhost"
					/>
				</div>
				
				<div>
					<label class="block text-sm font-medium mb-1">端口:</label>
					<input
						class="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
						type="number"
						bind:value={testConfig.port}
					/>
				</div>
				
				<div>
					<label class="block text-sm font-medium mb-1">API Key:</label>
					<input
						class="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
						type="password"
						bind:value={testConfig.apiKey}
						placeholder="可选，用于完整测试"
					/>
				</div>
				
				<div class="flex items-center">
					<input
						type="checkbox"
						id="enableTls"
						bind:checked={testConfig.enableTls}
						class="mr-2"
					/>
					<label for="enableTls" class="text-sm font-medium">启用 TLS</label>
				</div>
			</div>
			
			<div class="flex space-x-2">
				<button
					onclick={runDiagnostics}
					disabled={debugResults.loading}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{debugResults.loading ? '诊断中...' : '运行诊断'}
				</button>
				
				<button
					onclick={() => {
						testConfig.serverAddress = 'localhost';
						testConfig.port = 8080;
						testConfig.enableTls = false;
					}}
					class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
				>
					使用 Envoy 默认配置
				</button>
			</div>
		</div>

		<!-- Results Section -->
		{#if debugResults.configRecommendations}
			<div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 mb-6">
				<h3 class="text-lg font-semibold mb-3">配置建议</h3>
				<ul class="space-y-1">
					{#each debugResults.configRecommendations as recommendation}
						<li class="text-sm">{recommendation}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if debugResults.connectivity}
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
				<h3 class="text-lg font-semibold mb-3">
					基础连接测试 
					<span class="text-sm {debugResults.connectivity.success ? 'text-green-600' : 'text-red-600'}">
						{debugResults.connectivity.success ? '✅ 成功' : '❌ 失败'}
					</span>
				</h3>
				
				<div class="space-y-2">
					{#each debugResults.connectivity.details as detail}
						<div class="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">{detail}</div>
					{/each}
				</div>
				
				{#if debugResults.connectivity.recommendations.length > 0}
					<div class="mt-4">
						<h4 class="font-medium mb-2">建议:</h4>
						<ul class="space-y-1">
							{#each debugResults.connectivity.recommendations as rec}
								<li class="text-sm text-orange-600 dark:text-orange-400">• {rec}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}

		{#if debugResults.connectionTest}
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
				<h3 class="text-lg font-semibold mb-3">
					gRPC 连接测试
					<span class="text-sm {debugResults.connectionTest.success ? 'text-green-600' : 'text-red-600'}">
						{debugResults.connectionTest.success ? '✅ 成功' : '❌ 失败'}
					</span>
				</h3>

				<div class="text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded font-mono whitespace-pre-wrap">
					{debugResults.connectionTest.error || '连接成功'}
				</div>

				<!-- 显示原始响应数据 -->
				{#if debugResults.connectionTest.rawResponse}
					<div class="mt-4">
						<h4 class="font-medium mb-2">原始响应数据:</h4>
						<div class="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs font-mono">
							<div class="mb-2">
								<strong>响应大小:</strong> {debugResults.connectionTest.rawResponse.size} 字节
							</div>
							<div class="mb-2">
								<strong>十六进制转储:</strong>
								<div class="bg-white dark:bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
									{debugResults.connectionTest.rawResponse.hexDump}
								</div>
							</div>
							<div class="mb-2">
								<strong>UTF-8 解码 (非严格):</strong>
								<div class="bg-white dark:bg-gray-900 p-2 rounded mt-1 break-all">
									{debugResults.connectionTest.rawResponse.utf8Text}
								</div>
							</div>
							<div class="mb-2">
								<strong>ASCII 可见字符:</strong>
								<div class="bg-white dark:bg-gray-900 p-2 rounded mt-1 break-all">
									{debugResults.connectionTest.rawResponse.asciiText}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Instructions -->
		<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
			<h3 class="text-lg font-semibold mb-3">使用说明</h3>
			<div class="space-y-2 text-sm">
				<p><strong>1. 基础连接测试:</strong> 检查服务器是否可达，不需要 API Key</p>
				<p><strong>2. gRPC 连接测试:</strong> 需要有效的 API Key，测试完整的 gRPC 通信</p>
				<p><strong>3. Envoy 配置:</strong> 如果使用 Envoy 代理，请使用端口 8080 和禁用 TLS</p>
				<p><strong>4. 直连配置:</strong> 直接连接 Headscale 使用端口 50443 和启用 TLS</p>
			</div>
		</div>
	</div>
</div>

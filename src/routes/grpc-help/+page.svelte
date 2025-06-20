<script lang="ts">
	import Page from '$lib/page/Page.svelte';
	import PageHeader from '$lib/page/PageHeader.svelte';
	import { App } from '$lib/States.svelte';

	let testUrl = $state('');
	let testResult = $state('');
	let testing = $state(false);

	async function testBasicConnectivity() {
		if (!testUrl.trim()) {
			testResult = '请输入要测试的 URL';
			return;
		}

		testing = true;
		testResult = '正在测试连接...';

		try {
			const response = await fetch(testUrl, {
				method: 'HEAD',
				signal: AbortSignal.timeout(5000),
			});

			if (response.ok) {
				testResult = `✅ 服务器可访问 (状态码: ${response.status})`;
			} else {
				testResult = `⚠️ 服务器响应异常 (状态码: ${response.status})`;
			}
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					testResult = '❌ 连接超时 - 检查服务器地址和网络连接';
				} else if (error.message.includes('CORS')) {
					testResult = '⚠️ CORS 错误 - 服务器可能需要配置 CORS 头';
				} else {
					testResult = `❌ 连接失败: ${error.message}`;
				}
			} else {
				testResult = '❌ 未知错误';
			}
		} finally {
			testing = false;
		}
	}

	function setTestUrl(url: string) {
		testUrl = url;
		testBasicConnectivity();
	}

	// Envoy 配置生成器
	let envoyConfig = $state({
		headscaleServer: App.grpcConfig.value.serverAddress || 'vpn.ownding.xyz',
		headscalePort: 50443,
		proxyPort: 8080
	});

	const generatedEnvoyConfig = $derived(`static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address: { address: 0.0.0.0, port_value: ${envoyConfig.proxyPort} }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          codec_type: auto
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: local_service
              domains: ["*"]
              routes:
              - match: { prefix: "/" }
                route:
                  cluster: headscale_service
                  timeout: 0s
                  max_stream_duration:
                    grpc_timeout_header_max: 0s
              cors:
                allow_origin_string_match:
                - prefix: "*"
                allow_methods: GET, PUT, DELETE, POST, OPTIONS
                allow_headers: keep-alive,user-agent,cache-control,content-type,content-transfer-encoding,custom-header-1,x-accept-content-transfer-encoding,x-accept-response-streaming,x-user-agent,x-grpc-web,grpc-timeout,authorization
                max_age: "1728000"
                expose_headers: custom-header-1,grpc-status,grpc-message
          http_filters:
          - name: envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
          - name: envoy.extensions.filters.http.cors.v3.Cors
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
          - name: envoy.extensions.filters.http.router.v3.Router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
  - name: headscale_service
    connect_timeout: 0.25s
    type: logical_dns
    http2_protocol_options: {}
    lb_policy: round_robin
    load_assignment:
      cluster_name: headscale_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: ${envoyConfig.headscaleServer}
                port_value: ${envoyConfig.headscalePort}`);

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			// 可以添加一个 toast 通知
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}
</script>

<Page>
	<PageHeader title="gRPC 配置帮助" />
	
	<div class="max-w-4xl mx-auto p-6 space-y-6">
		<!-- 当前配置状态 -->
		<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">当前 gRPC 配置状态</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<div class="flex justify-between">
						<span class="text-sm font-medium">服务器地址:</span>
						<span class="text-sm {App.grpcConfig.value.serverAddress ? 'text-green-600' : 'text-red-600'}">
							{App.grpcConfig.value.serverAddress || '未配置'}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm font-medium">端口:</span>
						<span class="text-sm">{App.grpcConfig.value.port}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm font-medium">TLS:</span>
						<span class="text-sm">{App.grpcConfig.value.enableTls ? '启用' : '禁用'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm font-medium">API Key:</span>
						<span class="text-sm {App.grpcConfig.value.apiKey ? 'text-green-600' : 'text-red-600'}">
							{App.grpcConfig.value.apiKey ? '已配置' : '未配置'}
						</span>
					</div>
				</div>
				
				<div class="space-y-2">
					<div class="text-sm font-medium">配置状态:</div>
					<div class="text-sm {App.isGrpcConfigured ? 'text-green-600' : 'text-yellow-600'}">
						{App.isGrpcConfigured ? '✅ gRPC 已配置' : '⚠️ gRPC 未完全配置'}
					</div>
					{#if App.grpcConnectionStatus.value.lastTested}
						<div class="text-sm">
							<span class="font-medium">最后测试:</span>
							<span class="{App.grpcConnectionStatus.value.connected ? 'text-green-600' : 'text-red-600'}">
								{App.grpcConnectionStatus.value.connected ? '成功' : '失败'}
							</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- 连接测试工具 -->
		<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">连接测试工具</h2>
			
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium mb-2">测试 URL:</label>
					<div class="flex space-x-2">
						<input
							class="flex-1 input"
							type="text"
							placeholder="http://localhost:8080"
							bind:value={testUrl}
						/>
						<button
							class="btn variant-filled-primary"
							onclick={testBasicConnectivity}
							disabled={testing}
						>
							{testing ? '测试中...' : '测试连接'}
						</button>
					</div>
				</div>

				<div class="flex flex-wrap gap-2">
					<button class="btn btn-sm variant-ghost" onclick={() => setTestUrl('http://localhost:8080')}>
						本地 Envoy (8080)
					</button>
					<button class="btn btn-sm variant-ghost" onclick={() => setTestUrl('http://localhost:8000')}>
						本地 grpcwebproxy (8000)
					</button>
					<button class="btn btn-sm variant-ghost" onclick={() => setTestUrl(`http://${App.grpcConfig.value.serverAddress}:${App.grpcConfig.value.port}`)}>
						当前配置
					</button>
				</div>

				{#if testResult}
					<div class="p-3 rounded border bg-gray-50 dark:bg-gray-700">
						<div class="text-sm">{testResult}</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Envoy 配置生成器 -->
		<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">Envoy 配置生成器</h2>

			<div class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium mb-1">Headscale 服务器地址:</label>
						<input
							class="input w-full"
							type="text"
							bind:value={envoyConfig.headscaleServer}
							placeholder="vpn.ownding.xyz"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium mb-1">Headscale gRPC 端口:</label>
						<input
							class="input w-full"
							type="number"
							bind:value={envoyConfig.headscalePort}
							placeholder="50443"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium mb-1">代理监听端口:</label>
						<input
							class="input w-full"
							type="number"
							bind:value={envoyConfig.proxyPort}
							placeholder="8080"
						/>
					</div>
				</div>

				<div>
					<div class="flex justify-between items-center mb-2">
						<h3 class="text-lg font-medium">生成的 envoy.yaml 配置:</h3>
						<button
							class="btn btn-sm variant-filled-secondary"
							onclick={() => copyToClipboard(generatedEnvoyConfig)}
						>
							复制配置
						</button>
					</div>
					<div class="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm max-h-96 overflow-y-auto">
						<pre class="whitespace-pre-wrap">{generatedEnvoyConfig}</pre>
					</div>
				</div>

				<div class="bg-blue-50 dark:bg-blue-900 p-4 rounded">
					<h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">启动步骤:</h4>
					<ol class="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
						<li>将上面的配置保存为 <code>envoy.yaml</code></li>
						<li>运行: <code>docker run -d -p {envoyConfig.proxyPort}:{envoyConfig.proxyPort} -v $(pwd)/envoy.yaml:/etc/envoy/envoy.yaml envoyproxy/envoy:v1.28-latest</code></li>
						<li>在设置中配置: 服务器地址 <code>localhost</code>, 端口 <code>{envoyConfig.proxyPort}</code>, TLS 禁用</li>
					</ol>
				</div>
			</div>
		</div>

		<!-- 配置指南 -->
		<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">其他配置方法</h2>

			<div class="space-y-6">
				<div>
					<h3 class="text-lg font-medium mb-2">方法 2: 使用 grpcwebproxy</h3>
					<div class="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm">
						<pre class="whitespace-pre-wrap">grpcwebproxy \\
  --backend_addr={envoyConfig.headscaleServer}:{envoyConfig.headscalePort} \\
  --run_tls_server=false \\
  --allow_all_origins \\
  --backend_tls_noverify</pre>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
						然后在设置中使用: localhost:8000, TLS 禁用
					</p>
				</div>

				<div>
					<h3 class="text-lg font-medium mb-2">常见问题</h3>
					<ul class="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
						<li><strong>Failed to fetch:</strong> 通常表示没有配置 gRPC-Web 代理</li>
						<li><strong>CORS 错误:</strong> 需要在代理中配置 CORS 头</li>
						<li><strong>连接超时:</strong> 检查服务器地址和端口是否正确</li>
						<li><strong>401 错误:</strong> 检查 API Key 是否正确</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</Page>

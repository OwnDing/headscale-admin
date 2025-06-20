# gRPC 配置指南

## 问题诊断

如果您在测试 gRPC 连接时遇到 "Failed to fetch" 错误，这通常是由以下原因造成的：

### 1. Headscale 服务器配置问题

**问题**: Headscale 默认只提供 gRPC API，不提供 gRPC-Web API
**解决方案**: 需要配置 gRPC-Web 代理

#### 方法 A: 使用 Envoy 代理 (推荐)

创建 `envoy.yaml` 配置文件：

```yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address: { address: 0.0.0.0, port_value: 8080 }
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
                address: vpn.ownding.xyz
                port_value: 50443
```

启动 Envoy:
```bash
docker run -d -p 8080:8080 -v $(pwd)/envoy.yaml:/etc/envoy/envoy.yaml envoyproxy/envoy:v1.22-latest
```

然后在设置中使用：
- Server Address: `localhost` (或您的服务器地址)
- Port: `8080`
- Enable TLS: `false` (Envoy 处理 TLS)

#### 方法 B: 使用 grpcwebproxy

```bash
# 安装 grpcwebproxy
go install github.com/improbable-eng/grpc-web/go/grpcwebproxy@latest

# 启动代理
grpcwebproxy \
  --backend_addr=localhost:50443 \
  --run_tls_server=false \
  --allow_all_origins \
  --backend_tls_noverify
```

### 2. 网络连接问题

**检查项目**:
- 确保 Headscale 服务器可访问
- 检查防火墙设置
- 验证端口是否正确开放

**测试连接**:
```bash
# 测试基本连接
telnet vpn.ownding.xyz 50443

# 或使用 curl 测试 HTTP 连接
curl -v http://vpn.ownding.xyz:8080
```

### 3. CORS 问题

如果您看到 CORS 错误，需要在 gRPC-Web 代理中配置 CORS 头。

### 4. TLS 配置问题

**如果启用了 TLS**:
- 确保证书有效
- 检查证书是否包含正确的域名
- 考虑在开发环境中暂时禁用 TLS

## 推荐配置

### 开发环境
```
Server Address: localhost
Port: 8080 (Envoy 代理端口)
Enable TLS: false
Timeout: 10000ms
API Key: 您的 Headscale API Key
```

### 生产环境
```
Server Address: your-headscale-server.com
Port: 443 (通过反向代理)
Enable TLS: true
Timeout: 10000ms
API Key: 您的 Headscale API Key
```

## 故障排除步骤

1. **验证 Headscale 服务器运行状态**
   ```bash
   # 检查 gRPC 端口
   netstat -tlnp | grep 50443
   ```

2. **测试 REST API 连接**
   - 确保现有的 REST API 功能正常工作
   - 这验证了基本的网络连接

3. **检查浏览器开发者工具**
   - 查看 Network 标签页中的错误详情
   - 检查 Console 中的 JavaScript 错误

4. **逐步测试**
   - 先测试基本的 HTTP 连接
   - 再测试 gRPC-Web 代理
   - 最后测试完整的 gRPC 功能

## 当前实现说明

当前的 gRPC 客户端实现是简化版本，主要用于演示概念。在生产环境中，您需要：

1. 配置适当的 gRPC-Web 代理
2. 使用正确的 protobuf 编码
3. 实现完整的错误处理
4. 添加重试机制

## 联系支持

如果您仍然遇到问题，请提供以下信息：
- Headscale 版本
- 服务器配置
- 错误消息的完整内容
- 浏览器开发者工具中的网络请求详情

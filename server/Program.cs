using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);

var corsOrigin = Environment.GetEnvironmentVariable("CORS_ORIGIN")
                 ?? builder.Configuration["CORS_ORIGIN"]
                 ?? builder.Configuration["Cors:Origin"]
                 ?? "*";

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOrigin == "*")
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(corsOrigin).AllowAnyHeader().AllowAnyMethod();
        }
    });
});

var app = builder.Build();
app.UseCors();

app.MapPost("/compress-pdf", async (HttpRequest request) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { error = "multipart/form-data expected" });

    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file == null || file.Length == 0)
        return Results.BadRequest(new { error = "file is required" });

    var tmpDir = Path.Combine(Path.GetTempPath(), "docpackr");
    Directory.CreateDirectory(tmpDir);
    var inPath = Path.Combine(tmpDir, Guid.NewGuid() + ".pdf");
    var outPath = Path.Combine(tmpDir, Guid.NewGuid() + ".pdf");

    await using (var fs = File.Create(inPath))
    {
        await file.CopyToAsync(fs);
    }

    try
    {
        // Ghostscript command for decent compression on text-heavy PDFs
        var psi = new ProcessStartInfo
        {
            FileName = "gs",
            Arguments = string.Join(' ', new[]
            {
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-dPDFSETTINGS=/ebook",
                "-dDownsampleColorImages=true",
                "-dColorImageResolution=144",
                "-dDownsampleGrayImages=true",
                "-dGrayImageResolution=144",
                "-dDownsampleMonoImages=true",
                "-dMonoImageResolution=144",
                "-dNOPAUSE",
                "-dQUIET",
                "-dBATCH",
                $"-sOutputFile=\"{outPath}\"",
                $"\"{inPath}\""
            }),
            UseShellExecute = false,
            RedirectStandardError = true,
            RedirectStandardOutput = true
        };

        using var proc = Process.Start(psi)!;
        var cts = new CancellationTokenSource(TimeSpan.FromMinutes(2));
        await proc.WaitForExitAsync(cts.Token);
        if (proc.ExitCode != 0)
        {
            var err = await proc.StandardError.ReadToEndAsync();
            return Results.Problem($"Ghostscript failed: {err}", statusCode: 500);
        }

        var bytes = await File.ReadAllBytesAsync(outPath);
        return Results.File(bytes, "application/pdf", enableRangeProcessing: false);
    }
    finally
    {
        try { File.Delete(inPath); } catch { }
        try { File.Delete(outPath); } catch { }
    }
});

app.MapPost("/sign", async (SignRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.Manifest))
        return Results.BadRequest(new { error = "manifest is required" });

    var keyPath = Environment.GetEnvironmentVariable("RSA_PRIVATE_KEY_PATH")
                 ?? app.Configuration["Signing:PrivateKeyPath"];
    if (string.IsNullOrWhiteSpace(keyPath) || !File.Exists(keyPath))
        return Results.Problem("Missing RSA private key. Set RSA_PRIVATE_KEY_PATH.", statusCode: 500);

    var pem = await File.ReadAllTextAsync(keyPath);
    using var rsa = RSA.Create();
    rsa.ImportFromPem(pem);

    var data = Encoding.UTF8.GetBytes(req.Manifest);
    var hash = SHA256.HashData(data);
    var sig = rsa.SignHash(hash, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);

    return Results.Json(new
    {
        sha256 = Convert.ToHexString(hash).ToLowerInvariant(),
        signatureBase64 = Convert.ToBase64String(sig)
    });
});

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.Run();

record SignRequest(string Manifest);


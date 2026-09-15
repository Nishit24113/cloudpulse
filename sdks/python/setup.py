from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="cloudpulse",
    version="1.0.0",
    author="Nishit Patel",
    author_email="nishit24113@gmail.com",
    description="Universal observability SDK - Monitor any Python application",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Nishit24113/cloudpulse",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Monitoring",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=22.0.0",
            "flake8>=5.0.0",
        ],
        "fastapi": [
            "fastapi>=0.100.0",
            "starlette>=0.27.0",
        ],
        "flask": [
            "flask>=2.0.0",
        ],
        "django": [
            "django>=4.0.0",
        ],
    },
    keywords="observability monitoring metrics logs tracing apm cloudpulse datadog newrelic prometheus",
)

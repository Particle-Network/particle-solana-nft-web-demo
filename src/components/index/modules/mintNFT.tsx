import {
  MinusCircleOutlined,
  PlusOutlined,
  UploadOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Slider, Row, Col, Space, message, Upload, Tooltip } from 'antd';
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { mintNFT as addMintNFT, updateNFT } from '@/apis/index';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { selectNftList } from '@/store/nftSlice';
import { NftListType, NftData } from '@/types/types.d';

interface Props {
  activateMintId?: string;
  formType?: 'edit' | null | 'add';
  setActiveKey: (type: NftListType) => void;
  type: string;
}

const MintNFT = forwardRef((props: Props, ref) => {
  const { formType, activateMintId, setActiveKey } = props;

  const [form] = Form.useForm();

  const nftList = useAppSelector(selectNftList);

  const [loading, setLoading] = useState<boolean>(false);

  const onFinish = async () => {
    setLoading(true);
    const values = form.getFieldsValue();
    console.log(values);
    const config = { ...values };
    if (config.seller_fee_basis_points) {
      config.seller_fee_basis_points = config.seller_fee_basis_points * 100;
    }
    delete config.image;
    let res = null;
    if (formType == 'edit') {
      res = updateNFT(window.particle, activateMintId as string, config);
    } else {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as Blob);
      res = addMintNFT(window.particle, config, formData);
    }
    return res
      .then((res) => {
        if (res.error) {
          throw res.error.message;
        } else {
          message.success('success');
          setLoading(false);
          if (setActiveKey) {
            setActiveKey(NftListType.MyNft);
          }
          return true;
        }
      })
      .catch((error) => {
        message.error(typeof error == 'string' ? error : error.message);
        setLoading(false);
        throw error;
      });
  };

  const initEditFormData = async () => {
    const neftData = nftList.find((item: NftData) => item.mint == activateMintId) || {};
    const uri = neftData.nft.metadata.data.uri;
    const { name, symbol, sellerFeeBasisPoints: seller_fee_basis_points } = neftData.nft;
    const { image, attributes, description } = await fetch(uri)
      .then((res) => {
        return res.json();
      })
      .then((res) => {
        return res;
      });

    form.setFieldsValue({
      name,
      image: [image],
      attributes,
      description,
      seller_fee_basis_points: seller_fee_basis_points
        ? seller_fee_basis_points / 100
        : seller_fee_basis_points,
      symbol,
    });
    setFileList([
      {
        uid: '-1',
        name: 'image.png',
        status: 'done',
        url: image,
      },
    ]);
  };

  const [fileList, setFileList] = useState<Array<UploadFile>>([]);

  const onChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  useImperativeHandle(ref, () => ({
    initEditFormData,
    onFinish,
    form,
  }));

  useEffect(() => {
    if (activateMintId && formType == 'edit') {
      initEditFormData();
    }
  }, [activateMintId]);

  useEffect(() => {
    form.setFieldsValue({
      name: null,
      seller_fee_basis_points: 10,
      image: [],
      attributes: [
        {
          trait_type: null,
          value: null,
        },
      ],
    });
    return () => {
      form.resetFields();
      setFileList([]);
    };
  }, []);

  return (
    <div className="mint-nft-content">
      <Form
        form={form}
        name="mint-nft"
        size="large"
        labelCol={{
          span: 8,
        }}
        wrapperCol={{
          span: formType == 'edit' ? 14 : 10,
        }}
        onFinish={onFinish}
        autoComplete="off"
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[
            { required: true, message: 'Please input name' },
            { max: 32, message: 'Name max length 32' },
          ]}
        >
          <Input placeholder="Please input name" />
        </Form.Item>
        <Form.Item
          label="Symbol"
          name="symbol"
          rules={[
            { required: true, message: 'Please input Symbol ' },
            { max: 10, message: 'Symbol max length 10' },
          ]}
        >
          <Input placeholder="Please input symbol" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input placeholder="Please input description" />
        </Form.Item>
        <Form.Item
          label={
            <div className="fee-basis-points-label">
              <span>Fee Basis Points</span>
              <Tooltip placement="top" title="The royalties shared by the creators in basis points">
                <QuestionCircleOutlined />
              </Tooltip>
            </div>
          }
          name="seller_fee_basis_points"
        >
          <Slider max={100} disabled={formType == 'edit'} />
        </Form.Item>

        <Form.Item
          label="Image"
          name="image"
          valuePropName="image"
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (value && value.fileList && value.fileList.length) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Please upload picture'));
              },
            }),
          ]}
        >
          <Upload
            listType="picture"
            disabled={formType == 'edit'}
            fileList={fileList}
            onChange={onChange}
            maxCount={1}
            customRequest={(e) => {
              if (e.onSuccess) {
                e.onSuccess({});
              }
            }}
          >
            {!fileList.length ? <Button icon={<UploadOutlined />}>Click to upload</Button> : ''}
          </Upload>
        </Form.Item>

        <Form.List name="attributes">
          {(fields, { add, remove }) => (
            <div className="attributes-content">
              {fields.map((field, index) => (
                <Form.Item
                  key={field.key}
                  label="attributes"
                  noStyle={!!index}
                  rules={[{ required: true }]}
                  shouldUpdate={(prevValues, curValues) =>
                    prevValues.area !== curValues.area || prevValues.sights !== curValues.sights
                  }
                >
                  {() => (
                    <Row>
                      <Col span={index == 0 ? 24 : 10} offset={index == 0 ? 0 : 8}>
                        <Row className="attributes-row">
                          <Col span={11}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'trait_type']}
                              rules={[{ required: true, message: `Please input trait_type` }]}
                              wrapperCol={{
                                span: 24,
                              }}
                            >
                              <Input placeholder="trait_type" disabled={formType == 'edit'} />
                            </Form.Item>
                          </Col>
                          <Col span={11}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'value']}
                              rules={[{ required: true, message: `Please input value` }]}
                              wrapperCol={{
                                span: 24,
                              }}
                            >
                              <Input placeholder="value" disabled={formType == 'edit'} />
                            </Form.Item>
                          </Col>
                          <div className="delete-btn">
                            {index == 0 || formType == 'edit' ? (
                              ''
                            ) : (
                              <MinusCircleOutlined
                                style={{ color: '#fff' }}
                                onClick={() => remove(field.name)}
                              />
                            )}
                          </div>
                        </Row>
                      </Col>
                    </Row>
                  )}
                </Form.Item>
              ))}
              {formType == 'edit' ? (
                ''
              ) : (
                <Form.Item label=" " colon={false}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add attributes
                  </Button>
                </Form.Item>
              )}
            </div>
          )}
        </Form.List>

        {props.formType == 'edit' ? (
          ''
        ) : (
          <Form.Item
            className="mint-submit-btn"
            wrapperCol={{
              offset: 8,
              span: 10,
            }}
          >
            <Button type="primary" htmlType="submit" loading={loading}>
              MINT
            </Button>
          </Form.Item>
        )}
      </Form>
    </div>
  );
});

export default MintNFT;
